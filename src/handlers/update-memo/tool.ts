import { ToolHandler } from '../../types/index.js';
import { handleUpdateMemo } from './handler.js';

export const updateMemoTool: ToolHandler = {
  definition: {
    name: 'paput_update_memo',
    description: 'PaPut のメモを更新します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'メモID',
        },
        title: {
          type: 'string',
          description: 'メモのタイトル',
        },
        body: {
          type: 'string',
          description: 'メモの本文',
        },
        is_public: {
          type: 'boolean',
          description: 'メモを公開するかどうか',
        },
        categories: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description: '既存カテゴリーのID（新規の場合は省略）',
              },
              name: {
                type: 'string',
                description: 'カテゴリー名',
              },
            },
            required: ['name'],
          },
          description: 'カテゴリーの配列',
        },
      },
      required: ['id', 'title', 'body', 'is_public'],
    },
  },
  handler: handleUpdateMemo,
};
