import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const deleteSkillSheetProjectTool: ToolHandler = {
  definition: {
    name: 'paput_delete_skill_sheet_project',
    description: 'PaPut のスキルシートからプロジェクトを削除します',
    inputSchema: {
      type: 'object',
      properties: {
        project_id: {
          type: 'number',
          description: '削除するプロジェクトのID',
        },
      },
      required: ['project_id'],
    },
  },
  handler,
};
