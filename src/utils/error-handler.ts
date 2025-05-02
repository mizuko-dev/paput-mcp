import { Server } from '@modelcontextprotocol/sdk/server/index.js';

export function setupErrorHandling(server: Server): void {
  server.onerror = (error) => {
    console.error('[MCP Error]', error);
  };

  process.on('SIGINT', async () => {
    await server.close();
    process.exit(0);
  });
}
