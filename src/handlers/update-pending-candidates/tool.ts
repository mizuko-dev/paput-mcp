import { ToolHandler } from '../../types/index.js';
import { handleUpdatePendingCandidates } from './handler.js';

export const updatePendingCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_update_pending_candidates',
    description:
      'Update multiple pending knowledge candidates before they are saved to PaPut, in one tool call. This bulk version does not consume the API rate limit per item, and each candidate is processed independently so one failure does not block the others. Per item, only the fields you provide are changed; omitted fields keep their current value. Use this to refine candidates (title, body, categories, memo type keys, confidence, visibility, or linked projects) instead of discarding and re-adding them. Only candidates that are still pending can be updated.',
    inputSchema: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          description: 'Pending candidates to update',
          items: {
            type: 'object',
            properties: {
              candidate_id: {
                type: 'string',
                description: 'Pending candidate ID to update',
              },
              title: { type: 'string', description: 'Replacement title' },
              body: { type: 'string', description: 'Replacement body' },
              categories: {
                type: 'array',
                items: { type: 'string' },
                description: 'Replacement category names',
              },
              memo_type_keys: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['knowledge', 'decision', 'operation', 'principle'],
                },
                description:
                  'Array of memo type classification keys (each one of: knowledge, decision, operation, principle). A memo can have multiple keys at once. decision/operation/principle are the primary material for durable judgment and working-practice summaries.',
              },
              confidence: {
                type: 'number',
                minimum: 0,
                maximum: 1,
                description:
                  'Confidence score from 0 (low) to 1 (high) that this candidate is reusable and worth saving.',
              },
              is_public: {
                type: 'boolean',
                description: 'Whether the saved memo will be public',
              },
              projects: {
                type: 'array',
                description: 'Replacement linked projects',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    title: { type: 'string' },
                  },
                  required: ['id'],
                },
              },
            },
            required: ['candidate_id'],
          },
        },
      },
      required: ['candidates'],
    },
  },
  handler: handleUpdatePendingCandidates,
};
