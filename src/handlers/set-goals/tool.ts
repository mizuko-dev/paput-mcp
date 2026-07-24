import { ToolHandler } from '../../types/index.js';
import { handleSetGoals } from './handler.js';

export const setGoalsTool: ToolHandler = {
  definition: {
    name: 'paput_set_goals',
    description:
      'Set the full list of PaPut goals in one tool call (create, update, and delete by omission). This is a destructive full sync: pass the COMPLETE desired goal list. Items with an id update that owned goal; items without an id are created; any existing goal whose id is NOT in the list is DELETED. Existing goal ids are preserved so saved analyses that reference them keep working. List-external goals are deleted ONLY when every item in the request succeeds; if any item is invalid or fails, no goals are deleted (deleted_ids is empty) and the whole change is reported as failed. Use active goals for current analysis targets and archived goals for historical context.',
    inputSchema: {
      type: 'object',
      properties: {
        goals: {
          type: 'array',
          description:
            'The complete desired list of goals. Existing goals not included here are deleted.',
          items: {
            type: 'object',
            properties: {
              id: {
                type: 'number',
                description:
                  'Existing goal ID to update. Omit to create a new goal.',
              },
              title: { type: 'string', description: 'Goal title' },
              description: {
                type: 'string',
                description: 'Goal description',
              },
              category: {
                type: 'string',
                enum: ['career', 'learning', 'portfolio', 'project', 'other'],
                description: 'Goal category',
              },
              status: {
                type: 'string',
                enum: ['active', 'archived'],
                description:
                  'Goal status. Active goals are current targets; archived goals are history.',
              },
              priority: {
                type: 'number',
                minimum: 1,
                description:
                  'Goal priority. Lower numbers are higher priority.',
              },
              target_date: {
                type: 'string',
                description: 'Target date in YYYY-MM-DD format',
              },
            },
            required: ['title', 'category', 'status', 'priority'],
          },
        },
      },
      required: ['goals'],
    },
  },
  handler: handleSetGoals,
};
