import { ToolHandler } from '../../types/index.js';
import { handleDeleteNote } from './handler.js';

export const deleteNoteTool: ToolHandler = {
  definition: {
    name: 'paput_delete_note',
    description: 'PaPut のノートを削除します',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'number',
          description: 'ノートのID',
        },
      },
      required: ['id'],
    },
  },
  handler: handleDeleteNote,
};
