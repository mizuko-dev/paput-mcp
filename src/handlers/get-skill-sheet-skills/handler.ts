import { ApiClient } from '../../services/api/client.js';
import { getSkillSheetSkills } from '../../services/api/skill-sheet.js';

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  const response = await getSkillSheetSkills(apiClient);

  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(response, null, 2),
      },
    ],
  };
}
