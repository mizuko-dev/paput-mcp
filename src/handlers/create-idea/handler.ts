import { ApiClient } from '../../services/api/client.js';
import { createIdea } from '../../services/api/idea.js';
import { CreateIdeaParams } from '../../types/index.js';

export async function handleCreateIdea(
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
  const params: CreateIdeaParams = {
    title: args.title,
  };

  try {
    const result = await createIdea(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `アイデアの作成に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `アイデア「${params.title}」が正常に作成されました。`,
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
          text: `アイデアの作成中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
