import { ToolHandler } from '../../types/index.js';
import { handleGetNote } from './handler.js';

export const getNoteTool: ToolHandler = {
  definition: {
    name: 'paput_get_note',
    description: 'PaPut のノート詳細を取得します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'ノートのID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleGetNote,
};
