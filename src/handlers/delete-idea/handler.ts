import { ApiService } from '../../services/index.js';
import { DeleteIdeaParams } from '../../types/index.js';

export async function handleDeleteIdea(
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
  if (typeof args.id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'IDは数値で指定してください',
        },
      ],
      isError: true,
    };
  }

  const params: DeleteIdeaParams = {
    id: args.id,
  };

  try {
    const result = await apiService.deleteIdea(params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `アイデアの削除に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `アイデア (ID: ${params.id}) が正常に削除されました。`,
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
          text: `アイデアの削除中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
