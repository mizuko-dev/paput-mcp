import { ToolHandler } from '../../types/index.js';
import { handleCreateNote } from './handler.js';

export const createNoteTool: ToolHandler = {
  definition: {
    name: 'paput_create_note',
    description: 'PaPut にノートを作成します',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'ノートのタイトル',
        },
        is_public: {
          type: 'boolean',
          description: 'ノートを公開するかどうか',
          default: false,
        },
        memo_ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'ノートに含めるメモのIDリスト',
        },
      },
      required: ['title'],
    },
  },
  handler: handleCreateNote,
};
