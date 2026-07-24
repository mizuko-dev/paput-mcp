import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleUpdatePendingCandidates } from './handler.js';

describe('handleUpdatePendingCandidates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({
        success: true,
        updated_count: 0,
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
      (await handleUpdatePendingCandidates(undefined, client)).isError,
    ).toBe(true);
    expect(client.put).not.toHaveBeenCalled();
  });

  it('forwards only the provided fields per item in one API call', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        updated_count: 1,
        failed_count: 0,
        results: [
          { index: 0, candidate_id: 'c1', status: 'updated', error: null },
        ],
      }),
    });

    const result = await handleUpdatePendingCandidates(
      {
        candidates: [
          { candidate_id: 'c1', title: 'New title', is_public: true },
        ],
      },
      client,
    );

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates',
      {
        candidates: [
          { candidate_id: 'c1', title: 'New title', is_public: true },
        ],
      },
    );
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      updated_count: 1,
    });
  });

  it('fails an item locally when no updatable field is provided', async () => {
    const client = createMockClient();

    const result = await handleUpdatePendingCandidates(
      { candidates: [{ candidate_id: 'c1' }] },
      client,
    );

    expect(client.put).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results[0]).toMatchObject({
      index: 0,
      candidate_id: 'c1',
      status: 'failed',
    });
  });

  it('drops invalid items and remaps API results to original indexes', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        updated_count: 1,
        failed_count: 0,
        results: [
          { index: 0, candidate_id: 'ok', status: 'updated', error: null },
        ],
      }),
    });

    const result = await handleUpdatePendingCandidates(
      {
        candidates: [
          { candidate_id: 'bad', title: 42 },
          { candidate_id: 'ok', body: 'refined' },
        ],
      },
      client,
    );

    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates',
      {
        candidates: [{ candidate_id: 'ok', body: 'refined' }],
      },
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
        status: 'updated',
      }),
    ]);
  });

  it('fails a candidate with an invalid replacement-array element instead of silently filtering it', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
        success: true,
        updated_count: 1,
        failed_count: 0,
        results: [
          { index: 0, candidate_id: 'ok', status: 'updated', error: null },
        ],
      }),
    });

    const result = await handleUpdatePendingCandidates(
      {
        candidates: [
          { candidate_id: 'bad-cat', categories: ['Go', 123] },
          { candidate_id: 'bad-proj', projects: [{ id: '8' }] },
          { candidate_id: 'ok', title: 'Refined' },
        ],
      },
      client,
    );

    // 置換配列は全消去を招くので、不正要素を含む candidate は API へ送らず失敗させる。
    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates',
      {
        candidates: [{ candidate_id: 'ok', title: 'Refined' }],
      },
    );
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results).toEqual([
      expect.objectContaining({
        index: 0,
        candidate_id: 'bad-cat',
        status: 'failed',
      }),
      expect.objectContaining({
        index: 1,
        candidate_id: 'bad-proj',
        status: 'failed',
      }),
      expect.objectContaining({
        index: 2,
        candidate_id: 'ok',
        status: 'updated',
      }),
    ]);
  });
});
