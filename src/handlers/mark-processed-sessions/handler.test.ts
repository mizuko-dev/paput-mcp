import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleMarkProcessedSessions } from './handler.js';

describe('handleMarkProcessedSessions', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        success: true,
        marked_count: 0,
        failed_count: 0,
        results: [],
      }),
      put: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    } as unknown as ApiClient;
  }

  it('rejects arguments without a sessions array', async () => {
    const client = createMockClient();

    expect((await handleMarkProcessedSessions(undefined, client)).isError).toBe(
      true,
    );
    expect(
      (await handleMarkProcessedSessions({ sessions: 'nope' }, client)).isError,
    ).toBe(true);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('forwards valid sessions in one API call', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        marked_count: 2,
        failed_count: 0,
        results: [
          { index: 0, session_id: 'a', status: 'marked', error: null },
          { index: 1, session_id: 'b', status: 'marked', error: null },
        ],
      }),
    });

    const result = await handleMarkProcessedSessions(
      {
        sessions: [
          { source: 'claude', session_id: 'a' },
          {
            source: 'codex',
            session_id: 'b',
            source_session_updated_at: '2026-06-01T00:00:00.000Z',
          },
        ],
      },
      client,
    );

    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/processed-sessions', {
      sessions: [
        {
          source: 'claude',
          session_id: 'a',
          source_session_updated_at: undefined,
        },
        {
          source: 'codex',
          session_id: 'b',
          source_session_updated_at: '2026-06-01T00:00:00.000Z',
        },
      ],
    });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      marked_count: 2,
      failed_count: 0,
    });
  });

  it('drops invalid items before the API call and reports them at their original indexes', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        marked_count: 1,
        failed_count: 0,
        results: [
          { index: 0, session_id: 'ok', status: 'marked', error: null },
        ],
      }),
    });

    const result = await handleMarkProcessedSessions(
      {
        sessions: [
          'broken',
          { source: 'cursor', session_id: 'x' },
          { source: 'claude', session_id: 'ok' },
        ],
      },
      client,
    );

    // API へ渡すのは正常分のみ。
    expect(client.post).toHaveBeenCalledWith('/api/v1/mcp/processed-sessions', {
      sessions: [
        {
          source: 'claude',
          session_id: 'ok',
          source_session_updated_at: undefined,
        },
      ],
    });
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      marked_count: 1,
      failed_count: 2,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, status: 'failed' }),
      expect.objectContaining({
        index: 1,
        status: 'failed',
        error: 'source must be claude or codex',
      }),
      expect.objectContaining({ index: 2, status: 'marked' }),
    ]);
  });

  it('remaps API results to the original indexes when earlier items are invalid', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: false,
        marked_count: 1,
        failed_count: 1,
        results: [
          { index: 0, session_id: 'good', status: 'marked', error: null },
          {
            index: 1,
            session_id: 'bad-ts',
            status: 'failed',
            error: 'invalid timestamp',
          },
        ],
      }),
    });

    const result = await handleMarkProcessedSessions(
      {
        sessions: [
          { source: 'x', session_id: 'invalid' },
          { source: 'claude', session_id: 'good' },
          { source: 'codex', session_id: 'bad-ts' },
        ],
      },
      client,
    );

    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, status: 'failed' }),
      expect.objectContaining({ index: 1, session_id: 'good', status: 'marked' }),
      expect.objectContaining({
        index: 2,
        session_id: 'bad-ts',
        status: 'failed',
      }),
    ]);
  });

  it('maps a whole-call API failure to all valid items', async () => {
    const client = createMockClient({
      post: vi.fn().mockRejectedValue(new Error('server down')),
    });

    const result = await handleMarkProcessedSessions(
      {
        sessions: [
          { source: 'claude', session_id: 'a' },
          { source: 'codex', session_id: 'b' },
        ],
      },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      marked_count: 0,
      failed_count: 2,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, status: 'failed', error: 'server down' }),
      expect.objectContaining({ index: 1, status: 'failed', error: 'server down' }),
    ]);
  });

  it('succeeds without calling the API when sessions is empty', async () => {
    const client = createMockClient();

    const result = await handleMarkProcessedSessions({ sessions: [] }, client);

    expect(client.post).not.toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      marked_count: 0,
      failed_count: 0,
    });
  });
});
