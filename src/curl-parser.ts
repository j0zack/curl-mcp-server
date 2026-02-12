import type { ParsedCurlCommand, HttpRequestConfig } from './types.js';

/**
 * Parse a curl command string into a structured request configuration
 */
export function parseCurlCommand(curlCommand: string): HttpRequestConfig {
  const trimmed = curlCommand.trim();

  // Validate it starts with curl
  if (!trimmed.toLowerCase().startsWith('curl')) {
    throw new Error('Invalid curl command: Must start with "curl"');
  }

  // Initialize parsed result
  const parsed: ParsedCurlCommand = {
    url: '',
    method: 'GET',
    headers: {},
  };

  // Extract URL (first argument that looks like a URL)
  const urlRegex = /(?:^|\s)(https?:\/\/[^\s"'\$]+)/i;
  const urlMatch = trimmed.match(urlRegex);
  if (!urlMatch) {
    throw new Error('Could not find URL in curl command');
  }
  parsed.url = urlMatch[1];

  // Extract method (-X, --request)
  const methodRegex = /-(?:X|request)\s+(['"]?)([A-Z]+)\1/i;
  const methodMatch = trimmed.match(methodRegex);
  if (methodMatch) {
    parsed.method = methodMatch[2].toUpperCase();
  }

  // Extract headers (-H, --header)
  const headerRegex = /-(?:H|header)\s+(['"])([^']+)\1/gi;
  let headerMatch;
  while ((headerMatch = headerRegex.exec(trimmed)) !== null) {
    const headerLine = headerMatch[2];
    const colonIndex = headerLine.indexOf(':');
    if (colonIndex > 0) {
      const key = headerLine.substring(0, colonIndex).trim();
      const value = headerLine.substring(colonIndex + 1).trim();
      parsed.headers[key] = value;

      // Check for Authorization header
      if (key.toLowerCase() === 'authorization') {
        if (value.toLowerCase().startsWith('bearer ')) {
          parsed.auth = {
            type: 'bearer',
            token: value.substring(7),
          };
        }
      }
    }
  }

  // Extract data/body (-d, --data, --data-ascii, --data-binary, --data-urlencode)
  const dataRegex = /--data(?:-ascii|-binary|-urlencode)?\s+(['"])([^']+)\1|-(?:d|data)\s+(['"]?)([^'\s]+)\3/gi;
  let dataMatch;
  let body = '';
  while ((dataMatch = dataRegex.exec(trimmed)) !== null) {
    const dataValue = dataMatch[2] || dataMatch[4];
    if (dataValue) {
      // Unescape common escape sequences
      body = dataValue
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r');
      break;
    }
  }
  if (body) {
    parsed.body = body;
    // Default to POST if there's data and no explicit method
    if (!methodMatch) {
      parsed.method = 'POST';
    }
  }

  // Extract basic auth (-u, --user)
  const authRegex = /-(?:u|user)\s+(['"]?)([^'\s]+)\1/i;
  const authMatch = trimmed.match(authRegex);
  if (authMatch) {
    const credentials = authMatch[2];
    const colonIndex = credentials.indexOf(':');
    if (colonIndex > 0) {
      parsed.auth = {
        type: 'basic',
        username: credentials.substring(0, colonIndex),
        password: credentials.substring(colonIndex + 1),
      };
    } else {
      parsed.auth = {
        type: 'basic',
        username: credentials,
        password: '',
      };
    }
  }

  // Check for insecure flag (-k, --insecure)
  const hasInsecure = /-(?:k|insecure)\b/i.test(trimmed);

  // Convert to HttpRequestConfig
  const config: HttpRequestConfig = {
    url: parsed.url,
    method: parsed.method as any,
    headers: parsed.headers,
    body: parsed.body,
    auth: parsed.auth,
    timeout: 30000,
    followRedirects: true,
  };

  // Note: We're not handling the insecure flag here, but you could add
  // a httpsAgent option to disable SSL verification if needed

  return config;
}

/**
 * Extract just the URL from a curl command (useful for quick validation)
 */
export function extractUrlFromCurl(curlCommand: string): string {
  try {
    const parsed = parseCurlCommand(curlCommand);
    return parsed.url;
  } catch {
    return '';
  }
}

/**
 * Validate if a string is a valid curl command
 */
export function isValidCurlCommand(curlCommand: string): boolean {
  try {
    parseCurlCommand(curlCommand);
    return true;
  } catch {
    return false;
  }
}
