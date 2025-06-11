import { ApiService } from '../../services/index.js';
import { UpdateNoteParams } from '../../types/index.js';

export async function handleUpdateNote(
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

  // 少なくとも1つの更新項目が必要
  const hasUpdateFields =
    typeof args.title === 'string' ||
    typeof args.is_public === 'boolean' ||
    Array.isArray(args.memo_ids);

  if (!hasUpdateFields) {
    return {
      content: [
        {
          type: 'text',
          text: '更新する項目を少なくとも1つ指定してください',
        },
      ],
      isError: true,
    };
  }

  // パラメータの構築
  const params: UpdateNoteParams = {
    id: args.id,
  };

  if (typeof args.title === 'string') {
    params.title = args.title;
  }

  if (typeof args.is_public === 'boolean') {
    params.is_public = args.is_public;
  }

  if (Array.isArray(args.memo_ids)) {
    params.memos = args.memo_ids
      .filter((id): id is number => typeof id === 'number')
      .map((id) => ({ id }));
  }

  try {
    const result = await apiService.updateNote(params);

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `ノートの更新に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    const updateInfo = [];
    if (params.title) updateInfo.push(`タイトル: ${params.title}`);
    if (params.is_public !== undefined)
      updateInfo.push(`公開設定: ${params.is_public ? '公開' : '非公開'}`);
    if (params.memos) updateInfo.push(`メモ数: ${params.memos.length}件`);

    return {
      content: [
        {
          type: 'text',
          text: `ノート (ID: ${params.id}) が正常に更新されました。\n更新内容:\n${updateInfo.map((info) => `  - ${info}`).join('\n')}`,
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
          text: `ノートの更新中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
