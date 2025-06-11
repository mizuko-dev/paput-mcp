import { ToolHandler } from '../../types/index.js';
import { handleListIdeas } from './handler.js';

export const listIdeasTool: ToolHandler = {
  definition: {
    name: 'paput_list_ideas',
    description: 'PaPut のアイデア一覧を取得します',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleListIdeas,
};
