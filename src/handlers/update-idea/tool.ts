import { ToolHandler } from '../../types/index.js';
import { handleUpdateIdea } from './handler.js';

export const updateIdeaTool: ToolHandler = {
  definition: {
    name: 'paput_update_idea',
    description: 'PaPut のアイデアを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'アイデアのID',
        },
        title: {
          type: 'string',
          description: 'アイデアの新しいタイトル',
        },
      },
      required: ['id', 'title'],
    },
  },
  handler: handleUpdateIdea,
};
