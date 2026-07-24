import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import {
  markRemoteProcessedSessions,
  saveRemoteKnowledgeCandidates,
} from './knowledge-candidate.js';

function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    ...overrides,
  } as unknown as ApiClient;
}

describe('knowledge candidate bulk API service', () => {
  it('posts sessions to the processed-sessions endpoint', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        marked_count: 1,
        failed_count: 0,
        results: [{ index: 0, session_id: 's1', status: 'marked', error: null }],
      }),
    });
    const sessions = [
      {
        source: 'claude' as const,
        session_id: 's1',
        source_session_updated_at: '2026-06-01T00:00:00.000Z',
      },
    ];

    const response = await markRemoteProcessedSessions(client, sessions);

    expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/processed-sessions', {
      sessions,
    });
    expect(response).toMatchObject({ success: true, marked_count: 1 });
  });

  it('puts candidates to the bulk save endpoint', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        saved_count: 1,
        failed_count: 0,
        results: [
          {
            index: 0,
            candidate_id: 'c1',
            saved_memo_id: 100,
            status: 'saved',
            error: null,
          },
        ],
      }),
    });
    const candidates = [{ candidate_id: 'c1', saved_memo_id: 100 }];

    const response = await saveRemoteKnowledgeCandidates(client, candidates);

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates/save',
      { candidates },
    );
    expect(response).toMatchObject({ success: true, saved_count: 1 });
  });
});
