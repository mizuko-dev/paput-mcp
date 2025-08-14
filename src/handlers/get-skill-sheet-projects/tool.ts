import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const getSkillSheetProjectsTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet_projects',
    description: 'PaPut のスキルシートプロジェクト一覧を取得します',
    inputSchema: {
      type: 'object',
      properties: {
        search: {
          type: 'string',
          description: '検索キーワード',
        },
      },
    },
  },
  handler,
};
