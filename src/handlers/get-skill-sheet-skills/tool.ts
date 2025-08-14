import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const getSkillSheetSkillsTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet_skills',
    description: 'PaPut のスキルシートスキル一覧を取得します',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler,
};
