import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetSkills } from '../../services/api/skill-sheet.js';
import type { SkillSheetSkill } from '../../types/skill-sheet.js';

export interface UpdateSkillsParams {
  skills: SkillSheetSkill[];
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  const { skills } = params as unknown as UpdateSkillsParams;

  if (!skills) {
    return {
      content: [
        {
          type: 'text',
          text: 'スキル一覧が指定されていません',
        },
      ],
      isError: true,
    };
  }

  await updateSkillSheetSkills(apiClient, { skills });

  return {
    content: [
      {
        type: 'text',
        text: 'スキル一覧を更新しました',
      },
    ],
  };
}
