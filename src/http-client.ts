import axios, { AxiosError } from 'axios';
import type { HttpResponse, HttpRequestConfig } from './types.js';

/**
 * HTTP client for making requests with axios
 */
export class HttpClient {
  /**
   * Execute an HTTP request
   */
  async executeRequest(config: HttpRequestConfig): Promise<HttpResponse> {
    const startTime = Date.now();

    try {
      // Build axios config - use plain object to avoid type issues
      const headers: Record<string, string> = { ...(config.headers || {}) };
      const axiosConfig: any = {
        url: config.url,
        method: config.method.toLowerCase(),
        headers,
        timeout: config.timeout,
        maxRedirects: config.followRedirects ? 5 : 0,
        validateStatus: () => true, // Don't throw on any status code
      };

      // Add body if present
      if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
        axiosConfig.data = config.body;
        // Ensure Content-Type is set if not present
        if (!headers['Content-Type']) {
          headers['Content-Type'] = 'application/json';
        }
      }

      // Add authentication
      if (config.auth) {
        switch (config.auth.type) {
          case 'basic':
            if (config.auth.username && config.auth.password) {
              axiosConfig.auth = {
                username: config.auth.username,
                password: config.auth.password,
              };
            }
            break;
          case 'bearer':
            if (config.auth.token) {
              headers['Authorization'] = `Bearer ${config.auth.token}`;
            }
            break;
        }
      }

      // Execute request
      const response = await axios(axiosConfig);
      const duration = Date.now() - startTime;

      // Build response object
      const result: HttpResponse = {
        success: response.status >= 200 && response.status < 300,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers as Record<string, string>,
        body: this.formatBody(response.data),
        bodySize: this.calculateBodySize(response.data),
        duration,
      };

      // Add error info for non-success responses
      if (!result.success) {
        result.error = `HTTP ${response.status}: ${response.statusText}`;
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      // Handle different error types
      if (axios.isAxiosError(error)) {
        return this.handleAxiosError(error, duration);
      }

      // Handle unknown errors
      return {
        success: false,
        status: 0,
        statusText: 'Unknown Error',
        headers: {},
        body: '',
        bodySize: 0,
        duration,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Handle axios-specific errors
   */
  private handleAxiosError(error: AxiosError, duration: number): HttpResponse {
    if (error.response) {
      // Server responded with error status
      return {
        success: false,
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers as Record<string, string>,
        body: this.formatBody(error.response.data),
        bodySize: this.calculateBodySize(error.response.data),
        duration,
        error: `HTTP ${error.response.status}: ${error.response.statusText}`,
      };
    } else if (error.request) {
      // Request made but no response received
      return {
        success: false,
        status: 0,
        statusText: 'No Response',
        headers: {},
        body: '',
        bodySize: 0,
        duration,
        error: 'No response received from server',
      };
    } else {
      // Request setup error
      return {
        success: false,
        status: 0,
        statusText: 'Request Error',
        headers: {},
        body: '',
        bodySize: 0,
        duration,
        error: error.message,
      };
    }
  }

  /**
   * Format response body as string
   */
  private formatBody(data: unknown): string {
    if (data === undefined || data === null) {
      return '';
    }

    if (typeof data === 'string') {
      return data;
    }

    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch {
        return String(data);
      }
    }

    return String(data);
  }

  /**
   * Calculate body size in bytes
   */
  private calculateBodySize(data: unknown): number {
    const body = this.formatBody(data);
    return Buffer.byteLength(body, 'utf-8');
  }
}

/**
 * Singleton instance for convenience
 */
export const httpClient = new HttpClient();
