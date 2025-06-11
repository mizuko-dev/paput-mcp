import { ApiService } from '../../services/index.js';
import { DeleteMemoParams } from '../../types/index.js';

export async function handleDeleteMemo(
  args: Record<string, unknown> | undefined,
  apiService: ApiService,
) {
  if (!args || typeof args.id !== 'number') {
    return {
      content: [
        {
          type: 'text',
          text: 'メモIDが指定されていません。',
        },
      ],
      isError: true,
    };
  }

  const params: DeleteMemoParams = {
    id: args.id,
  };

  try {
    const result = await apiService.deleteMemo(params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `メモの削除に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: 'メモを削除しました。',
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
          text: `メモの削除中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
