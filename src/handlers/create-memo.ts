import { ApiService } from '../services/index.js';
import { CreateMemoParams } from '../types/index.js';

export async function handleCreateMemo(
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

  // パラメータの検証
  if (typeof args.title !== 'string' || typeof args.content !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: 'タイトルと本文は文字列で指定してください',
        },
      ],
      isError: true,
    };
  }

  // パラメータの構築
  const params: CreateMemoParams = {
    title: args.title,
    content: args.content,
    is_public: typeof args.is_public === 'boolean' ? args.is_public : false,
  };

  // カテゴリの処理
  if (Array.isArray(args.categories)) {
    params.categories = args.categories.filter(
      (item): item is string => typeof item === 'string',
    );
  }

  try {
    const result = await apiService.createMemo(params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `メモの作成に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `メモ「${params.title}」が正常に作成されました。`,
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
          text: `メモの作成中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
