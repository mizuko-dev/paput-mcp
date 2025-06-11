import { ToolHandler } from '../../types/index.js';
import { handleSearchNotes } from './handler.js';

export const searchNotesTool: ToolHandler = {
  definition: {
    name: 'paput_search_notes',
    description: 'PaPut のノートを検索します',
    inputSchema: {
      type: 'object',
      properties: {
        word: {
          type: 'string',
          description: '検索キーワード',
        },
        is_public: {
          type: 'boolean',
          description: '公開ノートのみを検索するかどうか',
        },
        page: {
          type: 'number',
          description: 'ページ番号 (1以上)',
          minimum: 1,
        },
        limit: {
          type: 'number',
          description: '1ページあたりの表示件数',
          minimum: 1,
          maximum: 100,
        },
      },
    },
  },
  handler: handleSearchNotes,
};
