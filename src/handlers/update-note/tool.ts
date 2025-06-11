import { ToolHandler } from '../../types/index.js';
import { handleUpdateNote } from './handler.js';

export const updateNoteTool: ToolHandler = {
  definition: {
    name: 'paput_update_note',
    description: 'PaPut のノートを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'ノートのID',
        },
        title: {
          type: 'string',
          description: 'ノートの新しいタイトル',
        },
        is_public: {
          type: 'boolean',
          description: 'ノートを公開するかどうか',
        },
        memo_ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'ノートに含めるメモのIDリスト',
        },
      },
      required: ['id'],
    },
  },
  handler: handleUpdateNote,
};
