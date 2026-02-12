# @j0zack/curl-mcp-server

**Execute curl commands and HTTP requests from Claude Desktop, n8n, or any MCP-compatible client.**

---

## ⚡ Quick Start

Add this to your n8n or Claude Desktop config:

```json
{
  "mcpServers": {
    "curl-mcp": {
      "command": "npx",
      "args": ["@j0zack/curl-mcp-server@latest"]
    }
  }
}
```

**That's it!** Restart your app and the tools appear automatically.

---

## 🎯 What It Does

- **Execute curl commands** - Paste any curl command and run it
- **Make HTTP requests** - Structured API calls with full control
- **Get full responses** - Status, headers, body, size, duration
- **Authentication** - Basic Auth and Bearer tokens
- **Custom headers** - Any header you need

---

## 🔧 Available Tools

### Tool 1: `execute_curl`
Run any curl command string.

**Example prompt:** "Execute `curl -X POST https://httpbin.org/post -d '{"test":"data"}'`"

### Tool 2: `http_request`
Structured HTTP requests with parameters.

**Example prompt:** "Make a POST request to https://api.example.com/data with body {\"name\":\"test\"}"

---

## 📖 Usage Examples

### In Claude Desktop
```
Fetch https://api.github.com/users/github and show me the response.
```

```
Execute curl -H "Authorization: Bearer token123" https://api.example.com/profile
```

```
Make a GET request to https://httpbin.org/get with custom header X-My-Header: value
```

### In n8n
Just add an MCP node and select `curl-mcp` - you'll see both tools ready to use.

---

## 📦 Installation Options

**Option 1: npx (Recommended)**
```json
{"command": "npx", "args": ["@j0zack/curl-mcp-server@latest"]}
```

**Option 2: Global install**
```bash
npm install -g @j0zack/curl-mcp-server
```
Then use: `{"command": "curl-mcp-server"}`

**Option 3: Pin version**
```json
{"command": "npx", "args": ["@j0zack/curl-mcp-server@1.0.0"]}
```

---

## 📝 Response Format

Both tools return:

```json
{
  "success": true,
  "status": 200,
  "statusText": "OK",
  "headers": {...},
  "body": "...",
  "bodySize": 1234,
  "duration": 123
}
```

---

## 🐛 Troubleshooting

**Tools not appearing?**
- Restart Claude Desktop/n8n completely
- Check the config has correct syntax
- Try: `npx @j0zack/curl-mcp-server@latest` in terminal

**"command not found"?**
- Make sure Node.js 20+ is installed
- Use npx syntax (it auto-downloads)

---

## 📄 License

MIT © j0zack

---

## 🔗 Links

- **npm:** https://www.npmjs.com/package/@j0zack/curl-mcp-server
- **GitHub:** https://github.com/j0zack/curl-mcp-server
