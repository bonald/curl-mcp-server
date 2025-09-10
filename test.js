#!/usr/bin/env node

// Simple test script to verify the MCP server is working
import { spawn } from 'child_process';

console.log('Testing Curl MCP Server...');

// Start the MCP server
const server = spawn('node', ['index.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

// Test initialize request
const initializeRequest = {
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: {
      name: 'test-client',
      version: '1.0.0'
    }
  }
};

// Test list tools request
const listToolsRequest = {
  jsonrpc: '2.0',
  id: 2,
  method: 'tools/list'
};

server.stdout.on('data', (data) => {
  console.log('Server response:', data.toString());
});

server.stderr.on('data', (data) => {
  console.log('Server log:', data.toString());
});

server.on('close', (code) => {
  console.log(`Server exited with code ${code}`);
});

// Send initialize request
setTimeout(() => {
  server.stdin.write(JSON.stringify(initializeRequest) + '\n');
}, 100);

// Send list tools request
setTimeout(() => {
  server.stdin.write(JSON.stringify(listToolsRequest) + '\n');
}, 200);

// Close after testing
setTimeout(() => {
  server.kill();
}, 2000);
