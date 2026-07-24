import { ToolHandler } from '../../types/index.js';
import { handleMarkProcessedSessions } from './handler.js';

export const markProcessedSessionsTool: ToolHandler = {
  definition: {
    name: 'paput_mark_processed_sessions',
    description:
      'Mark multiple Claude or Codex sessions as processed for knowledge capture in one tool call. This bulk version does not consume the API rate limit per item, and each session is processed independently so one failure does not block the others. Use after reviewing local sessions even when no pending candidates are added.',
    inputSchema: {
      type: 'object',
      properties: {
        sessions: {
          type: 'array',
          description: 'Sessions to mark as processed',
          items: {
            type: 'object',
            properties: {
              source: {
                type: 'string',
                enum: ['claude', 'codex'],
                description: 'Session source',
              },
              session_id: {
                type: 'string',
                description: 'Session ID that was reviewed',
              },
              source_session_updated_at: {
                type: 'string',
                description:
                  'Source session updated timestamp in ISO 8601 format',
              },
            },
            required: ['source', 'session_id'],
          },
        },
      },
      required: ['sessions'],
    },
  },
  handler: handleMarkProcessedSessions,
};
