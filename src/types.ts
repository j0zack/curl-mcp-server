import { z } from 'zod';

// HTTP methods enum
export const HttpMethod = z.enum([
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
] as const);
export type HttpMethod = z.infer<typeof HttpMethod>;

// Authentication types
export const AuthType = z.enum(['basic', 'bearer', 'none'] as const);
export type AuthType = z.infer<typeof AuthType>;

export const AuthConfig = z.object({
  type: AuthType,
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
});
export type AuthConfig = z.infer<typeof AuthConfig>;

// HTTP request config - define interface first for proper typing
export interface HttpRequestConfig {
  url: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string;
  auth?: {
    type: 'basic' | 'bearer' | 'none';
    username?: string;
    password?: string;
    token?: string;
  };
  timeout?: number;
  followRedirects?: boolean;
}

// Zod schema for validation
export const HttpRequestConfigSchema = z.object({
  url: z.string().url(),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const),
  headers: z.record(z.string(), z.string()).optional(),
  body: z.string().optional(),
  auth: z
    .object({
      type: z.enum(['basic', 'bearer', 'none'] as const),
      username: z.string().optional(),
      password: z.string().optional(),
      token: z.string().optional(),
    })
    .optional(),
  timeout: z.number().optional(),
  followRedirects: z.boolean().optional(),
});

// Response types
export interface HttpResponse {
  success: boolean;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body: string;
  bodySize: number;
  duration: number;
  error?: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  details?: string;
  suggestion?: string;
  code?: string;
}

// Parsed curl command result
export interface ParsedCurlCommand {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  auth?: {
    type: 'basic' | 'bearer' | 'none';
    username?: string;
    password?: string;
    token?: string;
  };
}

// MCP Tool input schemas
export const ExecuteCurlInputSchema = z.object({
  curlCommand: z.string().describe(
    'The curl command to execute (e.g., curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"key":"value"}\')'
  ),
});

export const HttpRequestInputSchema = z.object({
  url: z.string().url().describe('The URL to send the request to'),
  method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'] as const).describe('HTTP method to use'),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom headers to include in the request'),
  body: z.string().optional().describe('Request body (for POST, PUT, PATCH methods)'),
  auth: z
    .object({
      type: z.enum(['basic', 'bearer', 'none'] as const),
      username: z.string().optional(),
      password: z.string().optional(),
      token: z.string().optional(),
    })
    .optional()
    .describe('Authentication configuration'),
  timeout: z
    .number()
    .optional()
    .describe('Request timeout in milliseconds'),
  followRedirects: z
    .boolean()
    .optional()
    .describe('Whether to follow HTTP redirects'),
});

export type ExecuteCurlInput = z.infer<typeof ExecuteCurlInputSchema>;
export type HttpRequestInput = z.infer<typeof HttpRequestInputSchema>;
