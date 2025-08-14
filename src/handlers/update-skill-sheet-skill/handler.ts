import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetSkill } from '../../services/api/skill-sheet.js';
import type { SkillSheetSkill } from '../../types/skill-sheet.js';

export type UpdateSkillParams = SkillSheetSkill;

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  const { id, ...body } = params as unknown as UpdateSkillParams;

  if (!id) {
    return {
      content: [
        {
          type: 'text',
          text: 'IDが指定されていません',
        },
      ],
      isError: true,
    };
  }

  await updateSkillSheetSkill(apiClient, id, body);

  return {
    content: [
      {
        type: 'text',
        text: 'スキルを更新しました',
      },
    ],
  };
}
