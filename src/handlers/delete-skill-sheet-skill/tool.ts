import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const deleteSkillSheetSkillTool: ToolHandler = {
  definition: {
    name: 'paput_delete_skill_sheet_skill',
    description: 'PaPut のスキルシートからスキルを削除します',
    inputSchema: {
      type: 'object',
      properties: {
        skill_id: {
          type: 'number',
          description: '削除するスキルのID',
        },
      },
      required: ['skill_id'],
    },
  },
  handler,
};
