import { ToolHandler } from '../../types/index.js';
import { handleSearchMemo } from './handler.js';

export const searchMemoTool: ToolHandler = {
  definition: {
    name: 'paput_search_memo',
    description: 'PaPut のメモを検索します',
    inputSchema: {
      type: 'object',
      properties: {
        word: {
          type: 'string',
          description: '検索キーワード',
        },
        category_id: {
          type: 'number',
          description: 'カテゴリーID',
        },
        ids: {
          type: 'array',
          items: {
            type: 'number',
          },
          description: 'メモIDの配列',
        },
        date: {
          type: 'string',
          description: '日付（YYYY-MM-DD形式）',
        },
        is_public: {
          type: 'boolean',
          description: '公開/非公開フィルタ',
        },
        page: {
          type: 'number',
          description: 'ページ番号',
        },
        limit: {
          type: 'number',
          description: '取得件数',
        },
      },
    },
  },
  handler: handleSearchMemo,
};
