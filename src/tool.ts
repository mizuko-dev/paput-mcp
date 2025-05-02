import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { ApiService } from './services/api-service.js';
import { handleCreateMemo } from './handlers/index.js';

export function setupTool(
  server: Server,
  apiUrl: string,
  apiKey: string,
): void {
  const apiService = new ApiService(apiUrl, apiKey);

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: 'paput_create_memo',
        description: 'PaPut にメモを作成します',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'メモのタイトル',
            },
            content: {
              type: 'string',
              description: 'メモの内容',
            },
            is_public: {
              type: 'boolean',
              description: 'メモを公開するかどうか',
              default: false,
            },
            categories: {
              type: 'array',
              items: {
                type: 'string',
              },
              description: 'メモのカテゴリ',
            },
          },
          required: ['title', 'content'],
        },
      },
    ],
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    switch (request.params.name) {
      case 'paput_create_memo':
        return await handleCreateMemo(request.params.arguments, apiService);
      default:
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
  });
}
