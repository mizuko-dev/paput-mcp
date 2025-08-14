import { ApiClient } from '../../services/api/client.js';
import { getSkillSheetProjects } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  const search = params?.search as string | undefined;
  const response = await getSkillSheetProjects(apiClient, search);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}
