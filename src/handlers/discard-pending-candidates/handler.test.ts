import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleDiscardPendingCandidates } from './handler.js';

describe('handleDiscardPendingCandidates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({
        success: true,
        discarded_count: 0,
        failed_count: 0,
        results: [],
      }),
      delete: vi.fn(),
      ...overrides,
    } as unknown as ApiClient;
  }

  it('rejects arguments without a candidates array', async () => {
    const client = createMockClient();

    expect(
      (await handleDiscardPendingCandidates(undefined, client)).isError,
    ).toBe(true);
    expect(client.put).not.toHaveBeenCalled();
  });

  it('forwards valid candidates in one API call', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        discarded_count: 2,
        failed_count: 0,
        results: [
          { index: 0, candidate_id: 'c1', status: 'discarded', error: null },
          { index: 1, candidate_id: 'c2', status: 'discarded', error: null },
        ],
      }),
    });

    const result = await handleDiscardPendingCandidates(
      {
        candidates: [
          { candidate_id: 'c1' },
          { candidate_id: 'c2', reason: 'dup' },
        ],
      },
      client,
    );

    expect(client.put).toHaveBeenCalledTimes(1);
    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates/discard',
      {
        candidates: [
          { candidate_id: 'c1', reason: undefined },
          { candidate_id: 'c2', reason: 'dup' },
        ],
      },
    );
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      discarded_count: 2,
      failed_count: 0,
    });
  });

  it('drops invalid items and remaps API results to original indexes', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        discarded_count: 1,
        failed_count: 0,
        results: [
          { index: 0, candidate_id: 'ok', status: 'discarded', error: null },
        ],
      }),
    });

    const result = await handleDiscardPendingCandidates(
      { candidates: ['broken', { candidate_id: 'ok' }] },
      client,
    );

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates/discard',
      { candidates: [{ candidate_id: 'ok', reason: undefined }] },
    );
    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, status: 'failed' }),
      expect.objectContaining({
        index: 1,
        candidate_id: 'ok',
        status: 'discarded',
      }),
    ]);
  });

  it('fails an item with a non-string reason instead of discarding without a reason', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        discarded_count: 1,
        failed_count: 0,
        results: [
          { index: 0, candidate_id: 'ok', status: 'discarded', error: null },
        ],
      }),
    });

    const result = await handleDiscardPendingCandidates(
      {
        candidates: [
          { candidate_id: 'bad', reason: 123 },
          { candidate_id: 'ok', reason: 'dup' },
        ],
      },
      client,
    );

    // 不正 reason 要素は API リクエストから除外される（理由なし discard を防ぐ）。
    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates/discard',
      { candidates: [{ candidate_id: 'ok', reason: 'dup' }] },
    );
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results).toEqual([
      expect.objectContaining({
        index: 0,
        candidate_id: 'bad',
        status: 'failed',
      }),
      expect.objectContaining({
        index: 1,
        candidate_id: 'ok',
        status: 'discarded',
      }),
    ]);
  });

  it('maps a whole-call API failure to all valid items', async () => {
    const client = createMockClient({
      put: vi.fn().mockRejectedValue(new Error('server down')),
    });

    const result = await handleDiscardPendingCandidates(
      { candidates: [{ candidate_id: 'c1' }, { candidate_id: 'c2' }] },
      client,
    );

    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results).toEqual([
      expect.objectContaining({
        index: 0,
        status: 'failed',
        error: 'server down',
      }),
      expect.objectContaining({
        index: 1,
        status: 'failed',
        error: 'server down',
      }),
    ]);
  });
});
