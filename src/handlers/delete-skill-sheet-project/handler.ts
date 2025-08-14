import { ApiClient } from '../../services/api/client.js';
import { deleteSkillSheetProject } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  const projectId = params?.project_id as number;
  await deleteSkillSheetProject(apiClient, projectId);

  return {
    content: [
      {
        type: 'text',
        text: 'プロジェクトを削除しました',
      },
    ],
  };
}
