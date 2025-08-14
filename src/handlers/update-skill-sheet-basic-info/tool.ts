import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetBasicInfoTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_basic_info',
    description: 'PaPut のスキルシート基本情報を更新します',
    inputSchema: {
      type: 'object',
      properties: {
        nearest_station: {
          type: 'string',
          description: '最寄駅',
        },
        gender: {
          type: 'number',
          description: '性別（1: 男性, 2: 女性）',
        },
        birth_date: {
          type: 'string',
          description: '生年月日（YYYY-MM-DD形式）',
        },
        years_of_experience: {
          type: 'number',
          description: '経験年数',
        },
      },
    },
  },
  handler,
};
