import { ApiClient } from '../../services/api/client.js';
import { updateSkillSheetSelfPr } from '../../services/api/skill-sheet.js';

export interface UpdateSelfPrParams {
  self_pr?: string;
}

export async function handler(
  params: Record<string, unknown> | undefined,
  apiClient: ApiClient,
): Promise<any> {
  await updateSkillSheetSelfPr(apiClient, params as UpdateSelfPrParams);

  return {
    content: [
      {
        type: 'text',
        text: '自己PRを更新しました',
      },
    ],
  };
}
