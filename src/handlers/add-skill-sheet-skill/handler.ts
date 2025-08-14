import { ApiClient } from '../../services/api/client.js';
import { addSkillSheetSkill } from '../../services/api/skill-sheet.js';
import type { SkillSheetSkill } from '../../types/skill-sheet.js';

export type AddSkillParams = Omit<SkillSheetSkill, 'id'>;

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  await addSkillSheetSkill(apiClient, params as AddSkillParams);

  return {
    content: [
      {
        type: 'text',
        text: 'スキルを追加しました',
      },
    ],
  };
}
