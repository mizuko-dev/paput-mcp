import { ToolHandler } from '../../types/index.js';
import { handleDiscardPendingCandidates } from './handler.js';

export const discardPendingCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_discard_pending_candidates',
    description:
      'Discard multiple pending knowledge candidates in one tool call so they will not be saved as PaPut memos. This bulk version does not consume the API rate limit per item, and each candidate is processed independently so one failure does not block the others. This is destructive: discarded candidates are removed from the pending list. Only candidates that are still pending can be discarded; any other candidate is reported as failed. Use for duplicates, low-value candidates, or candidates with sensitive or project-specific content.',
    inputSchema: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          description: 'Pending candidates to discard',
          items: {
            type: 'object',
            properties: {
              candidate_id: {
                type: 'string',
                description: 'Candidate ID to discard',
              },
              reason: { type: 'string', description: 'Reason for discarding' },
            },
            required: ['candidate_id'],
          },
        },
      },
      required: ['candidates'],
    },
  },
  handler: handleDiscardPendingCandidates,
};
