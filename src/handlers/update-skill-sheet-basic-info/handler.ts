import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetBasicInfo } from '../../services/api/skill-sheet.js';

export interface UpdateBasicInfoParams {
  nearest_station?: string;
  gender?: number;
  birth_date?: string;
  years_of_experience?: number;
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  await updateSkillSheetBasicInfo(apiClient, params as UpdateBasicInfoParams);

  return {
    content: [
      {
        type: 'text',
        text: '基本情報を更新しました',
      },
    ],
  };
}
