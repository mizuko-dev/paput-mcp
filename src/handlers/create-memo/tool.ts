import { ToolHandler } from '../../types/index.js';
import { handleCreateMemo } from './handler.js';

export const createMemoTool: ToolHandler = {
  definition: {
    name: 'paput_create_memo',
    description: 'PaPut にメモを作成します',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'メモのタイトル',
        },
        body: {
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
      required: ['title', 'body'],
    },
  },
  handler: handleCreateMemo,
};
