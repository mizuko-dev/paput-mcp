import { ToolHandler } from '../../types/index.js';
import { handleSavePendingCandidates } from './handler.js';

const candidateItemSchema = {
  type: 'object',
  properties: {
    candidate_id: { type: 'string', description: 'Candidate ID to save' },
    saved_memo_id: {
      type: 'number',
      description:
        'Existing memo ID to attach when retrying after memo creation succeeded but candidate save failed. Omit for normal saves.',
    },
    title: { type: 'string', description: 'Title override when saving' },
    body: { type: 'string', description: 'Body override when saving' },
    created_at: {
      type: 'string',
      format: 'date-time',
      description:
        'Creation timestamp to use for the PaPut memo, in ISO 8601 date-time format. Defaults to the source session updated timestamp, then the pending candidate created timestamp.',
    },
    categories: { type: 'array', items: { type: 'string' } },
    memo_type_keys: {
      type: 'array',
      items: {
        type: 'string',
        enum: ['knowledge', 'decision', 'operation', 'principle'],
      },
      description:
        'Array of memo type classification keys to override when saving (each one of: knowledge, decision, operation, principle). A memo can have multiple keys at once. decision/operation/principle are the primary material for durable judgment and working-practice summaries.',
    },
    projects: {
      type: 'array',
      description: 'Projects to link when saving',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number' },
          title: { type: 'string' },
        },
        required: ['id'],
      },
    },
    is_public: { type: 'boolean', default: false },
  },
  required: ['candidate_id'],
};

export const savePendingCandidatesTool: ToolHandler = {
  definition: {
    name: 'paput_save_pending_candidates',
    description:
      'Save multiple approved pending knowledge candidates as PaPut memos and mark them saved, in one tool call. This bulk version does not consume the API rate limit per item, and each candidate is processed independently so one failure does not block the others. Use only with candidates the user has explicitly approved. If a candidate memo was created but its save failed, that result carries retry_args (candidate_id and saved_memo_id); pass those back as one item to retry the save without recreating the memo. Candidates without saved_memo_id are matched against the newest 200 pending candidates; beyond that, save them in smaller batches or pass saved_memo_id explicitly.',
    inputSchema: {
      type: 'object',
      properties: {
        candidates: {
          type: 'array',
          description: 'Approved pending candidates to save',
          items: candidateItemSchema,
        },
      },
      required: ['candidates'],
    },
  },
  handler: handleSavePendingCandidates,
};
