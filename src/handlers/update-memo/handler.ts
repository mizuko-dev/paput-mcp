import { ApiService } from '../../services/index.js';
import { UpdateMemoParams } from '../../types/index.js';

export async function handleUpdateMemo(
  args: Record<string, unknown> | undefined,
  apiService: ApiService,
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

  try {
    const result = await apiService.updateMemo(params);

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

    return {
      content: [
        {
          type: 'text',
          text: 'メモを更新しました。',
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
