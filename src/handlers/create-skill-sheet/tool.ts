import { ToolHandler } from '../../types/index.js';
import { handleCreateSkillSheet } from './handler.js';

export const createSkillSheetTool: ToolHandler = {
  definition: {
    name: 'paput_create_skill_sheet',
    description:
      'PaPut にスキルシートを作成します。既にスキルシートが存在する場合は更新ツール（paput_update_skill_sheet）を使用してください。',
    inputSchema: {
      type: 'object',
      properties: {
        nearest_station: {
          type: 'string',
          description: '最寄り駅（オプション）',
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
        self_pr: {
          type: 'string',
          description: '自己PR（オプション）',
        },
        skills: {
          type: 'array',
          description: 'スキルリスト（オプション）',
          items: {
            type: 'object',
            properties: {
              category: {
                type: 'object',
                properties: {
                  id: { type: 'number' },
                  name: { type: 'string' },
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
            required: ['category', 'category_type', 'level', 'years'],
          },
        },
        projects: {
          type: 'array',
          description: 'プロジェクトリスト（オプション）',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              type: {
                type: 'number',
                description: 'プロジェクトタイプ（1: 業務, 2: 個人）',
              },
              title: { type: 'string' },
              start_period: { type: 'string' },
              end_period: { type: ['string', 'null'] },
              description: { type: 'string' },
              role: { type: 'string' },
              scale: { type: 'string' },
              technologies: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    name: { type: 'string' },
                  },
                  required: ['id', 'name'],
                },
              },
              processes: {
                type: 'array',
                items: { type: 'number' },
              },
              memos: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    title: { type: 'string' },
                  },
                  required: ['id', 'title'],
                },
              },
            },
            required: [
              'id',
              'type',
              'title',
              'start_period',
              'description',
              'role',
              'scale',
              'technologies',
              'processes',
              'memos',
            ],
          },
        },
      },
      required: ['gender', 'birth_date', 'years_of_experience'],
    },
  },
  handler: handleCreateSkillSheet,
};
