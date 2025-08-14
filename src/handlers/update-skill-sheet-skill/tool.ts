import { ToolHandler } from '../../types/index.js';
import { handler } from './handler.js';

export const updateSkillSheetSkillTool: ToolHandler = {
  definition: {
    name: 'paput_update_skill_sheet_skill',
    description: 'PaPut のスキルシートのスキルを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'スキルID',
        },
        category: {
          type: 'object',
          properties: {
            id: {
              type: 'number',
              description: 'カテゴリID',
            },
            name: {
              type: 'string',
              description: 'カテゴリ名',
            },
          },
          required: ['id', 'name'],
        },
        category_type: {
          type: 'number',
          description:
            'カテゴリタイプ（1: 言語, 2: フレームワーク, 3: データベース, 4: インフラ）',
        },
        level: {
          type: 'string',
          description: 'スキルレベル（A, B, C, D, E）',
        },
        years: {
          type: 'number',
          description: '経験年数',
        },
      },
      required: ['id', 'category', 'category_type', 'level', 'years'],
    },
  },
  handler,
};
