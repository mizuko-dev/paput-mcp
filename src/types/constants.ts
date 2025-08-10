// 性別の定数
export const GENDER = {
  1: '男性',
  2: '女性',
} as const;

// プロジェクトタイプの定数
export const PROJECT_TYPE = {
  1: '業務',
  2: '個人',
} as const;

// カテゴリータイプの定数
export const CATEGORY_TYPE = {
  1: '言語',
  2: 'フレームワーク',
  3: 'データベース',
  4: 'インフラ',
} as const;

// スキルレベルの定数
export const SKILL_LEVEL = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D',
  E: 'E',
} as const;

// 型定義
export type GenderType = keyof typeof GENDER;
export type ProjectTypeType = keyof typeof PROJECT_TYPE;
export type CategoryTypeType = keyof typeof CATEGORY_TYPE;
export type SkillLevelType = keyof typeof SKILL_LEVEL;
