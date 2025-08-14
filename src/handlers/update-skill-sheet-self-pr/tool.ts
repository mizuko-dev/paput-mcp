import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetSelfPrTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_self_pr',
    description: 'PaPut のスキルシート自己PRを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        self_pr: {
          type: 'string',
          description: '自己PR',
        },
      },
    },
  },
  handler,
};
