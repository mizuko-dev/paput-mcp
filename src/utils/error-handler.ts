import { McpServer } from '@modelcontextprotocol/server';

export function setupErrorHandling(server: McpServer): void {
  server.server.onerror = (error) => {
    console.error('[MCP Error]', error);
  };
}
