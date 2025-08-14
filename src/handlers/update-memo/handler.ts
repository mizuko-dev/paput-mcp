import { ApiClient } from '../../services/api/client.js';
import { searchSkillSheetProjects } from '../../services/api/skill-sheet.js';
import { UpdateMemoParams } from '../../types/index.js';
import { updateMemo } from '../../services/api/memo.js';

export async function handleUpdateMemo(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args) {
    return {
      content: [
        {
          type: 'text',
          text: 'パラメータが指定されていません。',
        },
      ],
      isError: true,
    };
  }

  if (
    typeof args.id !== 'number' ||
    typeof args.title !== 'string' ||
    typeof args.body !== 'string' ||
    typeof args.is_public !== 'boolean'
  ) {
    return {
      content: [
        {
          type: 'text',
          text: '必須パラメータが不足しているか、型が正しくありません。',
        },
      ],
      isError: true,
    };
  }

  const categories: UpdateMemoParams['categories'] = [];
  if (Array.isArray(args.categories)) {
    for (const cat of args.categories) {
      if (typeof cat === 'object' && cat !== null && 'name' in cat) {
        const category: UpdateMemoParams['categories'][0] = {
          name: String(cat.name),
        };
        if ('id' in cat && typeof cat.id === 'number') {
          category.id = cat.id;
        }
        categories.push(category);
      }
    }
  }

  const params: UpdateMemoParams = {
    id: args.id,
    title: args.title,
    body: args.body,
    is_public: args.is_public,
    categories,
  };

  // プロジェクトの処理
  if (Array.isArray(args.projects)) {
    params.projects = args.projects.filter(
      (item): item is { id: number; title?: string } =>
        typeof item === 'object' &&
        item !== null &&
        'id' in item &&
        typeof item.id === 'number',
    );
  } else if (!args.projects && process.env.PAPUT_PROJECT_MATCH) {
    // 環境変数が設定されている場合、プロジェクトを検索して自動紐付け
    try {
      const projects = await searchSkillSheetProjects(
        apiClient,
        process.env.PAPUT_PROJECT_MATCH,
      );
      if (projects.length > 0) {
        // 最初にマッチしたプロジェクトを使用
        params.projects = [projects[0]];
      }
    } catch (error) {
      // プロジェクト検索が失敗しても、メモ更新は続行
      console.error('Failed to search projects:', error);
    }
  }

  try {
    const result = await updateMemo(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `メモの更新に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    let message = 'メモを更新しました。';
    if (params.projects && params.projects.length > 0) {
      message += `\nプロジェクト: ${params.projects[0].title || `ID: ${params.projects[0].id}`}`;
    }

    return {
      content: [
        {
          type: 'text',
          text: message,
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
          text: `メモの更新中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
