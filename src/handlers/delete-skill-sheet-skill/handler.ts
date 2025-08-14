import { ApiClient } from '../../services/api/client.js';
import { deleteSkillSheetSkill } from '../../services/api/skill-sheet.js';

export interface DeleteSkillParams {
  skill_id: number;
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  if (!params || !('skill_id' in params)) {
    throw new Error('skill_id is required');
  }
  const { skill_id } = params as unknown as DeleteSkillParams;

  await deleteSkillSheetSkill(apiClient, skill_id);

  return {
    content: [
      {
        type: 'text',
        text: 'スキルを削除しました',
      },
    ],
  };
}
