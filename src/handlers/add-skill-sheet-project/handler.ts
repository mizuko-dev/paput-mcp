import { ApiClient } from '../../services/api/client.js';
import { addSkillSheetProject } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  if (!params) {
    throw new Error('Project parameters are required');
  }

  const response = await addSkillSheetProject(apiClient, params as any);

  return {
    content: [
      {
        type: 'text',
        text: `プロジェクトを追加しました: ${JSON.stringify(response, null, 2)}`,
      },
    ],
  };
}
