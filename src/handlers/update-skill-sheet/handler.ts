import { ApiService } from '../../services/index.js';
import { UpdateSkillSheetParams } from '../../types/index.js';

export async function handleUpdateSkillSheet(
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

  try {
    // 既存のスキルシートを取得
    let existingSheet;
    try {
      existingSheet = await apiService.getSkillSheet();
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : '不明なエラー';
      if (errorMessage.includes('404') || errorMessage.includes('not found')) {
        return {
          content: [
            {
              type: 'text',
              text: '既存のスキルシートが見つかりません。先にスキルシートを作成してください。',
            },
          ],
          isError: true,
        };
      }
      throw error;
    }

    // 既存のデータをベースにパラメータを構築
    const params: UpdateSkillSheetParams = {
      gender: existingSheet.gender,
      birth_date: existingSheet.birth_date,
      years_of_experience: existingSheet.years_of_experience,
      nearest_station: existingSheet.nearest_station,
      self_pr: existingSheet.self_pr,
      skills: existingSheet.skills,
      projects: existingSheet.projects,
    };

    // 指定されたフィールドのみを更新
    if (typeof args.nearest_station === 'string') {
      params.nearest_station = args.nearest_station;
    }

    if (typeof args.gender === 'number') {
      params.gender = args.gender;
    }

    if (typeof args.birth_date === 'string') {
      params.birth_date = args.birth_date;
    }

    if (typeof args.years_of_experience === 'number') {
      params.years_of_experience = args.years_of_experience;
    }

    if (typeof args.self_pr === 'string') {
      params.self_pr = args.self_pr;
    }

    if (Array.isArray(args.skills)) {
      params.skills = args.skills;
    }

    if (Array.isArray(args.projects)) {
      params.projects = args.projects;
    }

    const result = await apiService.updateSkillSheet(params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `スキルシートの更新に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    const updateInfo = [];
    if (typeof args.nearest_station === 'string') updateInfo.push('最寄り駅');
    if (typeof args.gender === 'number') updateInfo.push('性別');
    if (typeof args.birth_date === 'string') updateInfo.push('生年月日');
    if (typeof args.years_of_experience === 'number')
      updateInfo.push('経験年数');
    if (typeof args.self_pr === 'string') updateInfo.push('自己PR');
    if (Array.isArray(args.skills)) updateInfo.push('スキル');
    if (Array.isArray(args.projects)) updateInfo.push('プロジェクト');

    return {
      content: [
        {
          type: 'text',
          text: `スキルシートが正常に更新されました。\n更新項目: ${updateInfo.join(', ')}`,
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
          text: `スキルシートの更新中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
