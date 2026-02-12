/**
 * HTTP Wrapper for Curl MCP Server
 *
 * This provides an HTTP API for n8n or other systems to interact with
 * the curl functionality without using the MCP protocol.
 */

import express from 'express';
import axios from 'axios';

const app = express();
app.use(express.json());

// Configuration
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

/**
 * Parse curl command (simplified version)
 */
function parseCurlCommand(curlCommand) {
  const parsed = {
    url: '',
    method: 'GET',
    headers: {},
    body: undefined,
  };

  // Extract URL
  const urlMatch = curlCommand.match(/https?:\/\/[^\s"'\$]+/i);
  if (urlMatch) {
    parsed.url = urlMatch[0];
  }

  // Extract method
  const methodMatch = curlCommand.match(/-(?:X|request)\s+(['"]?)([A-Z]+)\1/i);
  if (methodMatch) {
    parsed.method = methodMatch[2].toUpperCase();
  }

  // Extract headers
  const headerRegex = /-(?:H|header)\s+(['"])([^']+)\1/gi;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(curlCommand)) !== null) {
    const headerLine = headerMatch[2];
    const colonIndex = headerLine.indexOf(':');
    if (colonIndex > 0) {
      const key = headerLine.substring(0, colonIndex).trim();
      const value = headerLine.substring(colonIndex + 1).trim();
      parsed.headers[key] = value;
    }
  }

  // Extract data/body
  const dataRegex = /--data(?:-ascii|-binary|-urlencode)?\s+(['"])([^']+)\1|-(?:d|data)\s+(['"]?)([^'\s]+)\3/gi;
  let dataMatch;
  while ((dataMatch = dataRegex.exec(curlCommand)) !== null) {
    const dataValue = dataMatch[2] || dataMatch[4];
    if (dataValue) {
      parsed.body = dataValue.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r');
      if (!methodMatch) {
        parsed.method = 'POST';
      }
      break;
    }
  }

  return parsed;
}

/**
 * Execute HTTP request
 */
async function executeHttpRequest(config) {
  const startTime = Date.now();

  try {
    const axiosConfig = {
      url: config.url,
      method: config.method.toLowerCase(),
      headers: config.headers || {},
      timeout: config.timeout || 30000,
      maxRedirects: config.followRedirects !== false ? 5 : 0,
      validateStatus: () => true,
    };

    // Add body
    if (config.body && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      axiosConfig.data = config.body;
      if (!axiosConfig.headers['Content-Type']) {
        axiosConfig.headers['Content-Type'] = 'application/json';
      }
    }

    // Add auth
    if (config.auth) {
      if (config.auth.type === 'basic' && config.auth.username && config.auth.password) {
        axiosConfig.auth = {
          username: config.auth.username,
          password: config.auth.password,
        };
      } else if (config.auth.type === 'bearer' && config.auth.token) {
        axiosConfig.headers['Authorization'] = `Bearer ${config.auth.token}`;
      }
    }

    const response = await axios(axiosConfig);
    const duration = Date.now() - startTime;

    return {
      success: response.status >= 200 && response.status < 300,
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
      body: typeof response.data === 'object' ? JSON.stringify(response.data, null, 2) : response.data,
      bodySize: Buffer.byteLength(
        typeof response.data === 'object' ? JSON.stringify(response.data) : response.data || '',
        'utf-8',
      ),
      duration,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    if (error.response) {
      return {
        success: false,
        status: error.response.status,
        statusText: error.response.statusText,
        headers: error.response.headers,
        body: typeof error.response.data === 'object' ? JSON.stringify(error.response.data) : error.response.data,
        bodySize: 0,
        duration,
        error: `HTTP ${error.response.status}: ${error.response.statusText}`,
      };
    }

    return {
      success: false,
      status: 0,
      statusText: 'Error',
      headers: {},
      body: '',
      bodySize: 0,
      duration,
      error: error.message,
    };
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'curl-mcp-http-wrapper', version: '1.0.0' });
});

// Execute curl command
app.post('/api/execute_curl', async (req, res) => {
  try {
    const { curlCommand } = req.body;

    if (!curlCommand) {
      return res.status(400).json({ error: 'curlCommand is required' });
    }

    // Parse curl command
    const parsed = parseCurlCommand(curlCommand);

    // Execute request
    const result = await executeHttpRequest(parsed);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      status: 0,
      statusText: 'Error',
      headers: {},
      body: '',
      bodySize: 0,
      duration: 0,
    });
  }
});

// Execute HTTP request
app.post('/api/http_request', async (req, res) => {
  try {
    const { url, method = 'GET', headers, body, auth, timeout, followRedirects } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'url is required' });
    }

    const config = {
      url,
      method,
      headers,
      body,
      auth,
      timeout,
      followRedirects,
    };

    const result = await executeHttpRequest(config);

    res.json(result);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      status: 0,
      statusText: 'Error',
      headers: {},
      body: '',
      bodySize: 0,
      duration: 0,
    });
  }
});

// Start server
app.listen(PORT, HOST, () => {
  console.log(`Curl MCP HTTP Wrapper running on http://${HOST}:${PORT}`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  GET  /health                     - Health check`);
  console.log(`  POST /api/execute_curl          - Execute curl command`);
  console.log(`  POST /api/http_request         - Execute HTTP request`);
  console.log(`\nExample n8n usage:`);
  console.log(`  POST http://localhost:${PORT}/api/execute_curl`);
  console.log(`  Body: { "curlCommand": "curl https://httpbin.org/get" }`);
  console.log(`  POST http://localhost:${PORT}/api/http_request`);
  console.log(`  Body: { "url": "https://httpbin.org/get", "method": "GET" }`);
});
