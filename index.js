#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

class CurlMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: "curl-mcp-server",
        version: "1.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: "curl_request",
            description: "Execute a curl command to make HTTP requests to specified URLs with response size limiting",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL to make the request to",
                },
                method: {
                  type: "string",
                  enum: ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"],
                  default: "GET",
                  description: "HTTP method to use",
                },
                headers: {
                  type: "object",
                  description: "Headers to include in the request",
                  additionalProperties: {
                    type: "string"
                  }
                },
                data: {
                  type: "string",
                  description: "Data to send with the request (for POST, PUT, PATCH)",
                },
                timeout: {
                  type: "number",
                  default: 30,
                  description: "Request timeout in seconds",
                },
                follow_redirects: {
                  type: "boolean",
                  default: true,
                  description: "Whether to follow redirects",
                },
                include_headers: {
                  type: "boolean",
                  default: false,
                  description: "Include response headers in output",
                },
                user_agent: {
                  type: "string",
                  default: "curl-mcp-server/1.1.0",
                  description: "User agent string to use",
                },
                max_response_size: {
                  type: "number",
                  default: 800000,
                  description: "Maximum response size in bytes (default 800KB to stay well under 1MB limit)",
                }
              },
              required: ["url"],
            },
          },
          {
            name: "curl_download",
            description: "Download a file from a URL using curl",
            inputSchema: {
              type: "object",
              properties: {
                url: {
                  type: "string",
                  description: "The URL to download from",
                },
                output_path: {
                  type: "string",
                  description: "Local path where to save the downloaded file",
                },
                timeout: {
                  type: "number",
                  default: 300,
                  description: "Download timeout in seconds",
                },
                follow_redirects: {
                  type: "boolean",
                  default: true,
                  description: "Whether to follow redirects",
                }
              },
              required: ["url", "output_path"],
            },
          }
        ],
      };
    });

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case "curl_request":
          return await this.handleCurlRequest(args);
        case "curl_download":
          return await this.handleCurlDownload(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async handleCurlRequest(args) {
    try {
      const {
        url,
        method = "GET",
        headers = {},
        data,
        timeout = 30,
        follow_redirects = true,
        include_headers = false,
        user_agent = "curl-mcp-server/1.1.0",
        max_response_size = 800000
      } = args;

      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        throw new Error(`Invalid URL: ${url}`);
      }

      // Build curl command
      let curlCmd = [`curl`];
      
      // Basic options
      curlCmd.push(`--max-time ${timeout}`);
      curlCmd.push(`--user-agent "${user_agent}"`);
      curlCmd.push(`--silent`);
      curlCmd.push(`--show-error`);
      
      if (follow_redirects) {
        curlCmd.push(`--location`);
      }
      
      if (include_headers) {
        curlCmd.push(`--include`);
      }

      // Method
      curlCmd.push(`--request ${method}`);

      // Headers
      for (const [key, value] of Object.entries(headers)) {
        curlCmd.push(`--header "${key}: ${value}"`);
      }

      // Data for POST/PUT/PATCH
      if (data && ["POST", "PUT", "PATCH"].includes(method)) {
        curlCmd.push(`--data '${data.replace(/'/g, "\\'")}'`);
      }

      // URL (always last)
      curlCmd.push(`"${url}"`);

      const command = curlCmd.join(" ");
      
      // Execute with larger maxBuffer to handle big responses
      const { stdout, stderr } = await execAsync(command, { 
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      // Truncate response if it exceeds max_response_size
      let response = stdout;
      let truncated = false;
      const originalSize = stdout.length;
      
      if (response.length > max_response_size) {
        response = response.substring(0, max_response_size);
        truncated = true;
      }
      
      const result = {
        success: true,
        command: command,
        response: response,
        error: stderr || null
      };
      
      if (truncated) {
        result.truncated = true;
        result.original_size = originalSize;
        result.truncated_size = max_response_size;
        result.truncation_note = `Response truncated from ${originalSize} bytes to ${max_response_size} bytes`;
        result.warning = "Large response was truncated. Use max_response_size parameter to control truncation.";
      }
      
      // Ensure the final JSON doesn't exceed reasonable limits
      const resultJson = JSON.stringify(result, null, 2);
      if (resultJson.length > 1000000) { // 1MB safety check
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                truncated: true,
                original_size: originalSize,
                error: "Response too large even after truncation",
                sample: response.substring(0, 50000),
                note: "Only showing first 50KB of response due to size constraints"
              }, null, 2)
            }
          ]
        };
      }
      
      return {
        content: [
          {
            type: "text",
            text: resultJson
          }
        ]
      };

    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              stderr: error.stderr || null
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  async handleCurlDownload(args) {
    try {
      const {
        url,
        output_path,
        timeout = 300,
        follow_redirects = true
      } = args;

      // Validate URL
      try {
        new URL(url);
      } catch (error) {
        throw new Error(`Invalid URL: ${url}`);
      }

      // Build curl download command
      let curlCmd = [`curl`];
      
      curlCmd.push(`--max-time ${timeout}`);
      curlCmd.push(`--silent`);
      curlCmd.push(`--show-error`);
      curlCmd.push(`--progress-bar`);
      
      if (follow_redirects) {
        curlCmd.push(`--location`);
      }

      curlCmd.push(`--output "${output_path}"`);
      curlCmd.push(`"${url}"`);

      const command = curlCmd.join(" ");
      
      const { stdout, stderr } = await execAsync(command);
      
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: true,
              command: command,
              output_path: output_path,
              message: "File downloaded successfully",
              stderr: stderr || null
            }, null, 2)
          }
        ]
      };

    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              success: false,
              error: error.message,
              stderr: error.stderr || null
            }, null, 2)
          }
        ],
        isError: true
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("Curl MCP server v1.1.0 running on stdio with response size limiting");
  }
}

const server = new CurlMCPServer();
server.run().catch(console.error);
