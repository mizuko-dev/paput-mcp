import { ToolHandler } from '../../types/index.js';
import { handleDeleteMemo } from './handler.js';

export const deleteMemoTool: ToolHandler = {
  definition: {
    name: 'paput_delete_memo',
    description: 'PaPut のメモを削除します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'メモID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleDeleteMemo,
};
