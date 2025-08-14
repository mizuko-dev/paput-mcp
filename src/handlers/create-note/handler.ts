import { ApiClient } from '../../services/api/client.js';
import { createNote } from '../../services/api/note.js';
import { CreateNoteParams } from '../../types/index.js';

export async function handleCreateNote(
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
  const params: CreateNoteParams = {
    title: args.title,
    is_public: typeof args.is_public === 'boolean' ? args.is_public : false,
  };

  // メモの処理
  if (Array.isArray(args.memo_ids)) {
    params.memos = args.memo_ids
      .filter((id): id is number => typeof id === 'number')
      .map((id) => ({ id }));
  }

  try {
    const result = await createNote(apiClient, params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `ノートの作成に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `ノート「${params.title}」が正常に作成されました。${result.id ? `ID: ${result.id}` : ''}`,
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
          text: `ノートの作成中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
