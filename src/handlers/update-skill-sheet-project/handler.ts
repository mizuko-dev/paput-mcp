import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetProject } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  if (!params) {
    throw new Error('Project parameters are required');
  }

  await updateSkillSheetProject(apiClient, params as any);

  return {
    content: [
      {
        type: 'text',
        text: 'プロジェクトを更新しました',
      },
    ],
  };
}
