import { ToolHandler } from '../../types/index.js';
import { handleDeleteIdea } from './handler.js';

export const deleteIdeaTool: ToolHandler = {
  definition: {
    name: 'paput_delete_idea',
    description: 'PaPut のアイデアを削除します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'アイデアのID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleDeleteIdea,
};
