import { ApiClient } from '../../services/api/client.js';
import { updateIdea, UpdateIdeaParams } from '../../services/api/idea.js';

export async function handleUpdateIdea(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
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
  if (typeof args.id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'アイデアIDは数値で指定してください',
        },
      ],
      isError: true,
    };
  }

  if (typeof args.title !== 'string') {
    return {
      content: [
        {
          type: 'text',
          text: 'タイトルは文字列で指定してください',
        },
      ],
      isError: true,
    };
  }

  // パラメータの構築
  const params: UpdateIdeaParams = {
    id: args.id,
    title: args.title,
  };

  try {
    const result = await updateIdea(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `アイデアの更新に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `アイデア「${params.title}」が正常に更新されました。`,
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
          text: `アイデアの更新中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
