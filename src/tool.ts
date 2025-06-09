import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiService } from './services/api-service.js';
import { createMemoTool, searchMemoTool } from './handlers/index.js';
import { ToolHandler } from './types/index.js';

export function setupTool(
  server: Server,
  apiUrl: string,
  apiKey: string,
): void {
  const apiService = new ApiService(apiUrl, apiKey);

  const tools: ToolHandler[] = [createMemoTool, searchMemoTool];

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: tools.map((tool) => tool.definition),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = tools.find((t) => t.definition.name === request.params.name);

    if (!tool) {
      return {
        content: [
          {
            type: 'text',
            text: `未知のツールです: ${request.params.name}`,
          },
        ],
        isError: true,
      };
    }

    return await tool.handler(request.params.arguments, apiService);
  });
}
