import { ApiClient } from '../../services/api/client.js';
import {
  markRemoteProcessedSessions,
  type BulkMarkProcessedSessionResult,
  type MarkProcessedSessionInput,
} from '../../services/api/knowledge-candidate.js';
import type { SessionSource } from '../../types/knowledge.js';

export async function handleMarkProcessedSessions(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || !Array.isArray(args.sessions)) {
    return {
      content: [{ type: 'text', text: 'sessions must be an array' }],
      isError: true,
    };
  }

  const localFailed: BulkMarkProcessedSessionResult[] = [];
  const validSessions: MarkProcessedSessionInput[] = [];
  const originalIndexes: number[] = [];

  for (const [index, rawSession] of args.sessions.entries()) {
    if (typeof rawSession !== 'object' || rawSession === null) {
      localFailed.push({
        index,
        session_id: '',
        status: 'failed',
        error: 'Session item must be an object',
      });
      continue;
    }

    const session = rawSession as Record<string, unknown>;
    if (typeof session.session_id !== 'string') {
      localFailed.push({
        index,
        session_id: '',
        status: 'failed',
        error: 'session_id is required',
      });
      continue;
    }

    if (session.source !== 'claude' && session.source !== 'codex') {
      localFailed.push({
        index,
        session_id: session.session_id,
        status: 'failed',
        error: 'source must be claude or codex',
      });
      continue;
    }

    validSessions.push({
      source: session.source as SessionSource,
      session_id: session.session_id,
      source_session_updated_at:
        typeof session.source_session_updated_at === 'string'
          ? session.source_session_updated_at
          : undefined,
    });
    originalIndexes.push(index);
  }

  let apiResults: BulkMarkProcessedSessionResult[];
  if (validSessions.length === 0) {
    apiResults = [];
  } else {
    try {
      const response = await markRemoteProcessedSessions(
        apiClient,
        validSessions,
      );
      apiResults = response.results.map((result) => ({
        ...result,
        index: originalIndexes[result.index] ?? result.index,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      apiResults = validSessions.map((session, index) => ({
        index: originalIndexes[index] ?? index,
        session_id: session.session_id,
        status: 'failed',
        error: message,
      }));
    }
  }

  const results = [...localFailed, ...apiResults].sort(
    (a, b) => a.index - b.index,
  );
  const markedCount = results.filter(
    (result) => result.status === 'marked',
  ).length;
  const failedCount = results.filter(
    (result) => result.status === 'failed',
  ).length;

  const response = {
    success: failedCount === 0,
    marked_count: markedCount,
    failed_count: failedCount,
    results,
  };

  return {
    structuredContent: response,
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    isError: failedCount > 0,
  };
}
