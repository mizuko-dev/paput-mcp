import { ApiService } from '../../services/index.js';
import { GetMemoParams, GetMemoResponse } from '../../types/index.js';

export async function handleGetMemo(
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

  const params: GetMemoParams = {
    id: args.id,
  };

  try {
    const result = await apiService.getMemo(params);

    const categories =
      result.categories.length > 0
        ? `カテゴリ: ${result.categories.map((c) => c.name).join(', ')}`
        : '';
    const visibility = result.is_public ? '公開' : '非公開';
    const likeInfo = `いいね: ${result.like_count}${result.has_liked ? ' (いいね済み)' : ''}`;
    const bookmarkInfo = `ブックマーク: ${result.bookmark_count}${result.has_bookmarked ? ' (ブックマーク済み)' : ''}`;

    const memoDetail = `【${result.title}】(${visibility})
${categories}

${result.body}

${likeInfo}
${bookmarkInfo}

作成日: ${result.created_at}
更新日: ${result.updated_at}
作成者: ${result.user.name} (@${result.user.user_id})`;

    return {
      content: [
        {
          type: 'text',
          text: memoDetail,
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
          text: `メモの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
