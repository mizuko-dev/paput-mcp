import { ToolHandler } from '../../types/index.js';
import { handleGetCategories } from './handler.js';

export const getCategoriesTool: ToolHandler = {
  definition: {
    name: 'paput_get_categories',
    description: 'PaPut のカテゴリー一覧を取得します',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetCategories,
};
