import { ApiService } from '../../services/index.js';
import { CreateSkillSheetParams } from '../../types/index.js';

export async function handleCreateSkillSheet(
  args: Record<string, unknown> | undefined,
  apiService: ApiService,
) {
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'パラメータが不足しています',
        },
      ],
      isError: true,
    };
  }

  // 必須パラメータの検証
  if (
    typeof args.gender !== 'number' ||
    typeof args.birth_date !== 'string' ||
    typeof args.years_of_experience !== 'number'
  ) {
    return {
      content: [
        {
          type: 'text',
          text: '性別(gender)、生年月日(birth_date)、経験年数(years_of_experience)は必須項目です',
        },
      ],
      isError: true,
    };
  }

  // パラメータの構築
  const params: CreateSkillSheetParams = {
    nearest_station:
      typeof args.nearest_station === 'string' ? args.nearest_station : null,
    gender: args.gender,
    birth_date: args.birth_date,
    years_of_experience: args.years_of_experience,
    self_pr: typeof args.self_pr === 'string' ? args.self_pr : null,
    skills: Array.isArray(args.skills) ? args.skills : [],
    projects: Array.isArray(args.projects) ? args.projects : [],
  };

  try {
    const result = await apiService.createSkillSheet(params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `スキルシートの作成に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `スキルシートが正常に作成されました。${result.id ? `ID: ${result.id}` : ''}`,
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : '不明なエラー';

    return {
      content: [
        {
          type: 'text',
          text: `スキルシートの作成中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
