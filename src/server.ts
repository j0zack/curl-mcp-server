import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { httpClient } from './http-client.js';
import { parseCurlCommand } from './curl-parser.js';
import {
  ExecuteCurlInputSchema,
  HttpRequestInputSchema,
  type ExecuteCurlInput,
  type HttpRequestInput,
  type HttpRequestConfig,
} from './types.js';

/**
 * Apply default values to HTTP request config
 */
function applyDefaults(input: HttpRequestInput): HttpRequestConfig {
  return {
    url: input.url,
    method: input.method || 'GET',
    headers: input.headers as Record<string, string> | undefined,
    body: input.body,
    auth: input.auth,
    timeout: input.timeout ?? 30000,
    followRedirects: input.followRedirects ?? true,
  };
}

/**
 * Create and configure the MCP server
 */
export function createCurlMcpServer(): Server {
  // Create the MCP server
  const server = new Server(
    {
      name: 'curl-mcp-server',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // Register the list tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'execute_curl',
          description:
            'Parse and execute a curl command string. Supports common curl options including -X (method), -H (headers), -d/--data (body), -u/--user (basic auth). Returns the full HTTP response including status, headers, and body.',
          inputSchema: {
            type: 'object',
            properties: {
              curlCommand: {
                type: 'string',
                description:
                  'The curl command to execute (e.g., curl -X POST https://api.example.com/data -H "Content-Type: application/json" -d \'{"key":"value"}\')',
              },
            },
            required: ['curlCommand'],
          },
        },
        {
          name: 'http_request',
          description:
            'Make a structured HTTP request with explicit parameters. Supports all common HTTP methods, custom headers, request body, and authentication (Basic Auth and Bearer tokens). Returns the full HTTP response including status, headers, and body.',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'The URL to send the request to',
              },
              method: {
                type: 'string',
                enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                description: 'HTTP method to use',
                default: 'GET',
              },
              headers: {
                type: 'object',
                description: 'Custom headers to include in the request',
                additionalProperties: { type: 'string' },
              },
              body: {
                type: 'string',
                description: 'Request body (for POST, PUT, PATCH methods)',
              },
              auth: {
                type: 'object',
                description: 'Authentication configuration',
                properties: {
                  type: {
                    type: 'string',
                    enum: ['basic', 'bearer', 'none'],
                    description: 'Authentication type',
                  },
                  username: {
                    type: 'string',
                    description: 'Username for basic auth',
                  },
                  password: {
                    type: 'string',
                    description: 'Password for basic auth',
                  },
                  token: {
                    type: 'string',
                    description: 'Token for bearer auth',
                  },
                },
              },
              timeout: {
                type: 'number',
                description: 'Request timeout in milliseconds',
                default: 30000,
              },
              followRedirects: {
                type: 'boolean',
                description: 'Whether to follow HTTP redirects',
                default: true,
              },
            },
            required: ['url'],
          },
        },
      ],
    };
  });

  // Register the call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'execute_curl': {
          // Validate input
          const input = ExecuteCurlInputSchema.parse(args) as ExecuteCurlInput;

          // Parse curl command
          const config = parseCurlCommand(input.curlCommand);

          // Execute request
          const response = await httpClient.executeRequest(config);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }

        case 'http_request': {
          // Validate input
          const input = HttpRequestInputSchema.parse(args) as HttpRequestInput;

          // Apply defaults and execute request
          const config = applyDefaults(input);
          const response = await httpClient.executeRequest(config);

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2),
              },
            ],
          };
        }

        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Validation error
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  success: false,
                  error: 'Invalid input',
                  details: error.issues.map((e) => ({
                    path: e.path.join('.'),
                    message: e.message,
                  })),
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      // Other errors
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: false,
                error: errorMessage,
              },
              null,
              2
            ),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

/**
 * Start the MCP server with stdio transport
 */
export async function startServer(): Promise<void> {
  const server = createCurlMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Log startup (will be visible in debug mode)
  console.error('Curl MCP Server running on stdio');
}
