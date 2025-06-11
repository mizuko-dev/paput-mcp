import { ApiService } from '../../services/index.js';

export async function handleGetCategories(
  args: Record<string, unknown> | undefined,
  apiService: ApiService,
) {
  try {
    const categories = await apiService.getCategories();

    if (categories.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: 'カテゴリーが登録されていません。',
          },
        ],
      };
    }

    const categoryList = categories
      .map((category) => `• ${category.name} (ID: ${category.id})`)
      .join('\n');

    return {
      content: [
        {
          type: 'text',
          text: `利用可能なカテゴリー:\n\n${categoryList}`,
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
          text: `カテゴリーの取得中にエラーが発生しました: ${errorMessage}`,
        },
      ],
      isError: true,
    };
  }
}
