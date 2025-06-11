import { ApiService } from '../../services/index.js';

export async function handleListIdeas(
  args: Record<string, unknown> | undefined,
  apiService: ApiService,
) {
  try {
    const result = await apiService.listIdeas();

    if (!result.success) {
      return {
        content: [
          {
            type: 'text',
            text: `アイデアの取得に失敗しました: ${result.error || '不明なエラー'}`,
          },
        ],
        isError: true,
      };
    }

    if (!result.ideas || result.ideas.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'アイデアが登録されていません。',
          },
        ],
      };
    }

    const ideasList = result.ideas
      .sort((a, b) => a.sort - b.sort)
      .map((idea) => `- [${idea.id}] ${idea.title} (順序: ${idea.sort})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `アイデア一覧 (${result.ideas.length}件):\n${ideasList}`,
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
          text: `アイデアの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
