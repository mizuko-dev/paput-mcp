import { ToolHandler } from '../../types/index.js';
import { handleGetSkillSheet } from './handler.js';

export const getSkillSheetTool: ToolHandler = {
  definition: {
    name: 'paput_get_skill_sheet',
    description: 'PaPut のスキルシートを取得します',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  handler: handleGetSkillSheet,
};
