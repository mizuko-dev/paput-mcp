import { ToolHandler } from '../../types/index.js';
import { handleCreateIdea } from './handler.js';

export const createIdeaTool: ToolHandler = {
  definition: {
    name: 'paput_create_idea',
    description: 'PaPut にアイデアを作成します',
    inputSchema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'アイデアのタイトル',
        },
        sort: {
          type: 'number',
          description: '表示順序',
        },
      },
      required: ['title'],
    },
  },
  handler: handleCreateIdea,
};
