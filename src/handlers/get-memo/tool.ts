import { ToolHandler } from '../../types/index.js';
import { handleGetMemo } from './handler.js';

export const getMemoTool: ToolHandler = {
  definition: {
    name: 'paput_get_memo',
    description: 'PaPut のメモ詳細を取得します',
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
  handler: handleGetMemo,
};
