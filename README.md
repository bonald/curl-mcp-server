# Curl MCP Server v1.2.0

A Model Context Protocol (MCP) server that provides curl functionality for making HTTP requests and downloading files, optimized for GPT model compatibility with clean, simple JSON responses.

## Features

- **curl_request**: Make HTTP requests to any URL with support for:
  - Multiple HTTP methods (GET, POST, PUT, DELETE, PATCH, HEAD, OPTIONS)
  - Custom headers
  - Request data/body
  - Timeout configuration
  - User-agent customization
  - Redirect following
  - Response header inclusion
  - **Response size limiting** (NEW) - prevents excessive output by truncating large responses

- **curl_download**: Download files from URLs with:
  - Custom output path specification
  - Timeout configuration
  - Redirect following
  - Progress tracking

## New in v1.2.0

### Optimized for GPT Models
- Simplified response format by default - returns just the data without metadata wrappers
- Automatic JSON parsing when response is valid JSON
- Clean, minimal error messages
- Better handling of large JSON arrays and objects
- Direct data passthrough for easier processing by AI models

## Features from v1.1.0

### Response Size Limiting
- Added `max_response_size` parameter (default: 800KB)
- Automatically truncates large responses to prevent system overload
- Provides metadata about truncation (original size, truncated size, warning messages)
- Safely handles very large API responses (like Binance exchange info)

### Better Error Handling
- Increased internal buffer size to handle large responses before truncation
- Additional safety checks to prevent system memory issues
- Improved error messages and truncation notifications

## Installation

1. Install Node.js dependencies:
```bash
cd C:\claude\curl-mcp-server
npm install
```

2. Make sure `curl` is installed and available in your system PATH.

## Configuration

### Claude Desktop Configuration (v1.2.0)

Add this to your Claude Desktop configuration file (usually located at `%APPDATA%\Claude\claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "curl-mcp-server": {
      "command": "node",
      "args": ["C:\\claude\\curl-mcp-server\\index.js"],
      "env": {}
    }
  }
}
```



## Usage Examples

### Simple GET Request
```json
{
  "tool": "curl_request",
  "args": {
    "url": "https://api.github.com/users/octocat"
  }
}
```

### Response Format (v1.2.0)
All responses now return clean JSON or text data directly, making it easier for GPT models to process:
```json
{
  "tool": "curl_request",
  "args": {
    "url": "https://fapi.binance.com/fapi/v1/exchangeInfo"
  }
}
```
Returns the actual API response directly without metadata wrappers.

### Large Response with Size Limiting
```json
{
  "tool": "curl_request",
  "args": {
    "url": "https://fapi.binance.com/fapi/v1/exchangeInfo",
    "max_response_size": 500000
  }
}
```

### POST Request with Data
```json
{
  "tool": "curl_request",
  "args": {
    "url": "https://httpbin.org/post",
    "method": "POST",
    "headers": {
      "Content-Type": "application/json",
      "Authorization": "Bearer your-token"
    },
    "data": "{\"name\": \"John\", \"email\": \"john@example.com\"}"
  }
}
```

### Download a File
```json
{
  "tool": "curl_download",
  "args": {
    "url": "https://example.com/file.zip",
    "output_path": "C:\\downloads\\file.zip"
  }
}
```

### Request with Custom Response Size Limit
```json
{
  "tool": "curl_request",
  "args": {
    "url": "https://api.example.com/large-dataset",
    "method": "GET",
    "max_response_size": 1000000,
    "headers": {
      "Accept": "application/json"
    }
  }
}
```

## Response Size Limiting

The server now automatically limits response sizes to prevent overwhelming the system:

- **Default limit**: 800KB (800,000 bytes)
- **Customizable**: Use `max_response_size` parameter
- **Truncation info**: When responses are truncated, you'll receive:
  - `truncated: true`
  - `original_size`: Original response size in bytes
  - `truncated_size`: Size after truncation
  - `truncation_note`: Human-readable truncation message
  - `warning`: Advice about using the max_response_size parameter

### Example Response (v1.2.0)
For JSON APIs, returns the parsed JSON directly:
```json
{
  "result": [...],  // Direct API response
  "timestamp": "2024-01-01T00:00:00Z"
}
```

For text responses, returns the raw text:
```
Plain text response from the server
```

For errors, returns a simple error object:
```json
{
  "error": "Connection timeout"
}
```

## Security Notes

- This server executes curl commands locally, so ensure you trust the URLs being accessed
- Be cautious with file download paths to avoid overwriting important files
- Consider running in a sandboxed environment for additional security
- Response size limiting helps prevent memory exhaustion attacks

## Troubleshooting

1. **curl not found**: Make sure curl is installed and in your system PATH
2. **Permission denied**: Ensure the output directory exists and is writable
3. **Timeout errors**: Increase the timeout value for slow connections
4. **Large responses**: Use the `max_response_size` parameter to control truncation
5. **Memory issues**: The server now handles large responses safely with automatic truncation

## Parameters Reference

### curl_request Parameters
- `url` (required): Target URL
- `method`: HTTP method (default: "GET")
- `headers`: Object with custom headers
- `data`: Request body data
- `timeout`: Request timeout in seconds (default: 30)
- `follow_redirects`: Follow redirects (default: true)
- `include_headers`: Include response headers (default: false)
- `user_agent`: Custom user agent (default: "curl-mcp-server/1.1.0")
- `max_response_size`: Max response size in bytes (default: 800000)

## Dependencies

- Node.js (v14 or higher)
- curl (system dependency)
- @modelcontextprotocol/sdk

## Version History

- **v1.2.0**: Optimized for GPT models - simplified response format by default, automatic JSON parsing, cleaner output
- **v1.1.0**: Added response size limiting, better error handling, increased buffer size
- **v1.0.0**: Initial release with basic curl functionality

## License

MIT License
