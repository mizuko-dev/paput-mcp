import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import type { PendingKnowledgeCandidate } from '../../types/knowledge.js';
import { handleSavePendingCandidates } from './handler.js';

interface StageMocks {
  pending?: PendingKnowledgeCandidate[];
  listError?: Error;
  createMemos?: (memos: unknown[]) => unknown;
  saveCandidates?: (candidates: unknown[]) => unknown;
  saveError?: Error;
}

describe('handleSavePendingCandidates', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function buildCandidate(
    overrides: Partial<PendingKnowledgeCandidate> = {},
  ): PendingKnowledgeCandidate {
    return {
      id: 'c1',
      session_id: 's1',
      source: 'codex',
      title: 'Title 1',
      body: 'Body 1',
      categories: ['MCP'],
      projects: [],
      confidence: 0.9,
      is_public: false,
      status: 'pending',
      fingerprint: 'fp',
      similar_memos: [],
      created_at: '2026-06-01T10:00:00.000Z',
      updated_at: '2026-06-01T10:00:00.000Z',
      ...overrides,
    };
  }

  function setup(mocks: StageMocks): ApiClient {
    return {
      get: vi.fn().mockImplementation(async (endpoint: string) => {
        if (endpoint.startsWith('/api/v1/mcp/knowledge-candidates')) {
          if (mocks.listError) throw mocks.listError;
          const candidates = mocks.pending ?? [];
          return { count: candidates.length, candidates };
        }
        throw new Error(`Unexpected GET: ${endpoint}`);
      }),
      post: vi.fn().mockImplementation(async (endpoint: string, body: unknown) => {
        if (endpoint === '/api/v1/mcp/memos') {
          const memos = (body as { memos: unknown[] }).memos;
          return mocks.createMemos
            ? mocks.createMemos(memos)
            : {
                success: true,
                created_count: memos.length,
                failed_count: 0,
                created: memos.map((_m, index) => ({
                  index,
                  id: 100 + index,
                  title: `t${index}`,
                })),
                failed: [],
              };
        }
        throw new Error(`Unexpected POST: ${endpoint}`);
      }),
      put: vi.fn().mockImplementation(async (endpoint: string, body: unknown) => {
        if (endpoint === '/api/v1/mcp/knowledge-candidates/save') {
          if (mocks.saveError) throw mocks.saveError;
          const candidates = (body as { candidates: unknown[] }).candidates;
          return mocks.saveCandidates
            ? mocks.saveCandidates(candidates)
            : {
                success: true,
                saved_count: candidates.length,
                failed_count: 0,
                results: candidates.map((c, index) => ({
                  index,
                  candidate_id: (c as { candidate_id: string }).candidate_id,
                  saved_memo_id:
                    (c as { saved_memo_id?: number }).saved_memo_id ?? null,
                  status: 'saved',
                  error: null,
                })),
              };
        }
        throw new Error(`Unexpected PUT: ${endpoint}`);
      }),
      delete: vi.fn(),
      request: vi.fn(),
    } as unknown as ApiClient;
  }

  it('rejects arguments without a candidates array', async () => {
    const client = setup({});
    expect(
      (await handleSavePendingCandidates(undefined, client)).isError,
    ).toBe(true);
    expect(
      (await handleSavePendingCandidates({ candidates: 1 }, client)).isError,
    ).toBe(true);
  });

  it('creates memos and saves candidates in one call each (all success)', async () => {
    const client = setup({
      pending: [
        buildCandidate({ id: 'c1', title: 'T1', body: 'B1' }),
        buildCandidate({ id: 'c2', title: 'T2', body: 'B2' }),
      ],
    });

    const result = await handleSavePendingCandidates(
      { candidates: [{ candidate_id: 'c1' }, { candidate_id: 'c2' }] },
      client,
    );

    // list 1回・createMemos 1回・save 1回。
    expect(client.get).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.put).toHaveBeenCalledTimes(1);
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      saved_count: 2,
      failed_count: 0,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, candidate_id: 'c1', status: 'saved' }),
      expect.objectContaining({ index: 1, candidate_id: 'c2', status: 'saved' }),
    ]);
  });

  it('forwards a summary override to the created memo and leaves it empty when omitted', async () => {
    let created: unknown[] = [];
    const client = setup({
      pending: [
        buildCandidate({ id: 'c1', title: 'T1', body: 'B1' }),
        buildCandidate({ id: 'c2', title: 'T2', body: 'B2' }),
      ],
      createMemos: (memos) => {
        created = memos;
        return {
          success: true,
          created_count: memos.length,
          failed_count: 0,
          created: memos.map((_m, index) => ({
            index,
            id: 100 + index,
            title: `T${index + 1}`,
          })),
          failed: [],
        };
      },
    });

    await handleSavePendingCandidates(
      {
        candidates: [
          { candidate_id: 'c1', summary: '保存時に書いた一行要約' },
          { candidate_id: 'c2' },
        ],
      },
      client,
    );

    expect((created[0] as { summary?: string }).summary).toBe(
      '保存時に書いた一行要約',
    );
    expect((created[1] as { summary?: string }).summary).toBe('');
  });

  it('skips memo creation and the pending lookup when saved_memo_id is supplied', async () => {
    const client = setup({});

    const result = await handleSavePendingCandidates(
      { candidates: [{ candidate_id: 'c1', saved_memo_id: 456 }] },
      client,
    );

    expect(client.get).not.toHaveBeenCalled();
    expect(client.post).not.toHaveBeenCalled();
    expect(client.put).toHaveBeenCalledWith(
      '/api/v1/mcp/knowledge-candidates/save',
      { candidates: [expect.objectContaining({ candidate_id: 'c1', saved_memo_id: 456 })] },
    );
    expect(result.structuredContent).toMatchObject({
      saved_count: 1,
      failed_count: 0,
    });
  });

  it('attaches retry_args when a memo was created but its candidate save fails', async () => {
    const client = setup({
      pending: [
        buildCandidate({ id: 'c1', title: 'T1' }),
        buildCandidate({ id: 'c2', title: 'T2' }),
      ],
      createMemos: (memos) => ({
        success: true,
        created_count: memos.length,
        failed_count: 0,
        created: [
          { index: 0, id: 100, title: 'T1' },
          { index: 1, id: 101, title: 'T2' },
        ],
        failed: [],
      }),
      saveCandidates: (candidates) => ({
        success: false,
        saved_count: 1,
        failed_count: 1,
        results: [
          {
            index: 0,
            candidate_id: (candidates[0] as { candidate_id: string }).candidate_id,
            saved_memo_id: 100,
            status: 'saved',
            error: null,
          },
          {
            index: 1,
            candidate_id: (candidates[1] as { candidate_id: string }).candidate_id,
            saved_memo_id: null,
            status: 'failed',
            error: 'db conflict',
          },
        ],
      }),
    });

    const result = await handleSavePendingCandidates(
      { candidates: [{ candidate_id: 'c1' }, { candidate_id: 'c2' }] },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      saved_count: 1,
      failed_count: 1,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results[0]).toMatchObject({
      index: 0,
      candidate_id: 'c1',
      status: 'saved',
    });
    // メモ 101 は作成済みなので retry_args で回収できる。
    expect(results[1]).toMatchObject({
      index: 1,
      candidate_id: 'c2',
      status: 'failed',
      retry_args: { candidate_id: 'c2', saved_memo_id: 101 },
    });
  });

  it('does not advance a candidate to save when its memo creation fails, without index mixup', async () => {
    const savedBodies: unknown[] = [];
    const client = setup({
      pending: [
        buildCandidate({ id: 'c1', title: 'T1' }),
        buildCandidate({ id: 'c2', title: 'T2' }),
      ],
      createMemos: () => ({
        success: false,
        created_count: 1,
        failed_count: 1,
        // c1 のメモ作成は失敗、c2 は成功（id 202）。
        created: [{ index: 1, id: 202, title: 'T2' }],
        failed: [{ index: 0, title: 'T1', error: 'memo rejected' }],
      }),
      saveCandidates: (candidates) => {
        savedBodies.push(...candidates);
        return {
          success: true,
          saved_count: candidates.length,
          failed_count: 0,
          results: candidates.map((c, index) => ({
            index,
            candidate_id: (c as { candidate_id: string }).candidate_id,
            saved_memo_id: (c as { saved_memo_id?: number }).saved_memo_id ?? null,
            status: 'saved',
            error: null,
          })),
        };
      },
    });

    const result = await handleSavePendingCandidates(
      { candidates: [{ candidate_id: 'c1' }, { candidate_id: 'c2' }] },
      client,
    );

    // save へ進むのは c2 のみ、かつ正しいメモ id 202 で。
    expect(savedBodies).toEqual([
      expect.objectContaining({ candidate_id: 'c2', saved_memo_id: 202 }),
    ]);
    expect(result.structuredContent).toMatchObject({
      saved_count: 1,
      failed_count: 1,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results[0]).toMatchObject({
      index: 0,
      candidate_id: 'c1',
      status: 'failed',
      error: 'Failed to create memo: memo rejected',
    });
    expect(results[1]).toMatchObject({
      index: 1,
      candidate_id: 'c2',
      status: 'saved',
      saved_memo_id: 202,
    });
  });

  it('drops invalid items before any API call', async () => {
    const client = setup({
      pending: [buildCandidate({ id: 'c1' })],
    });

    const result = await handleSavePendingCandidates(
      {
        candidates: ['broken', { title: 'no id' }, { candidate_id: 'c1' }],
      },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      saved_count: 1,
      failed_count: 2,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, status: 'failed' }),
      expect.objectContaining({
        index: 1,
        status: 'failed',
        error: 'candidate_id is required',
      }),
      expect.objectContaining({ index: 2, candidate_id: 'c1', status: 'saved' }),
    ]);
  });

  it('fails candidates that need a memo but are not in the pending list', async () => {
    const client = setup({ pending: [] });

    const result = await handleSavePendingCandidates(
      { candidates: [{ candidate_id: 'missing' }] },
      client,
    );

    expect(client.post).not.toHaveBeenCalled();
    expect(client.put).not.toHaveBeenCalled();
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results[0]).toMatchObject({
      index: 0,
      candidate_id: 'missing',
      status: 'failed',
      error: expect.stringContaining('Candidate not found among pending candidates'),
    });
    expect((results[0] as { error: string }).error).toContain('200');
  });

  it('dedupes a repeated candidate_id, processing only the first occurrence (no retry_args on dupes)', async () => {
    const memoBodies: unknown[] = [];
    const client = setup({
      pending: [buildCandidate({ id: 'c1', title: 'T1' })],
      createMemos: (memos) => {
        memoBodies.push(...memos);
        return {
          success: true,
          created_count: memos.length,
          failed_count: 0,
          created: memos.map((_m, index) => ({
            index,
            id: 300 + index,
            title: `t${index}`,
          })),
          failed: [],
        };
      },
    });

    const result = await handleSavePendingCandidates(
      {
        candidates: [
          { candidate_id: 'c1' },
          { candidate_id: 'c1' },
          { candidate_id: 'c1' },
        ],
      },
      client,
    );

    // メモは1件だけ作られる（重複は副作用前に弾かれる）。
    expect(memoBodies).toHaveLength(1);
    expect(result.structuredContent).toMatchObject({
      saved_count: 1,
      failed_count: 2,
    });
    const results = (result.structuredContent as { results: Array<Record<string, unknown>> }).results;
    expect(results[0]).toMatchObject({ index: 0, candidate_id: 'c1', status: 'saved' });
    expect(results[1]).toMatchObject({
      index: 1,
      candidate_id: 'c1',
      status: 'failed',
      error: expect.stringContaining('Duplicate candidate_id'),
    });
    expect(results[1]).not.toHaveProperty('retry_args');
    expect(results[2]).toMatchObject({ index: 2, status: 'failed' });
    expect(results[2]).not.toHaveProperty('retry_args');
  });

  it('keeps the first occurrence even when a later duplicate supplies saved_memo_id', async () => {
    const client = setup({
      pending: [buildCandidate({ id: 'c1', title: 'T1' })],
    });

    // 先頭は unsupplied（メモ作成経路）、後続の重複は supplied（直接 save 経路）。
    const result = await handleSavePendingCandidates(
      {
        candidates: [
          { candidate_id: 'c1' },
          { candidate_id: 'c1', saved_memo_id: 999 },
        ],
      },
      client,
    );

    // 先頭のみ処理。後続の supplied 重複は save されない（直接 save 経路に入らない）。
    expect(client.post).toHaveBeenCalledTimes(1); // メモ作成1回
    const putBodies = (client.put as unknown as { mock: { calls: unknown[][] } }).mock.calls;
    expect(putBodies).toHaveLength(1);
    const savedCandidates = (putBodies[0][1] as { candidates: Array<{ candidate_id: string }> }).candidates;
    expect(savedCandidates).toEqual([
      expect.objectContaining({ candidate_id: 'c1' }),
    ]);
    const results = (result.structuredContent as { results: Array<Record<string, unknown>> }).results;
    expect(results[0]).toMatchObject({ index: 0, status: 'saved' });
    expect(results[1]).toMatchObject({
      index: 1,
      status: 'failed',
      error: expect.stringContaining('Duplicate candidate_id'),
    });
    expect(results[1]).not.toHaveProperty('retry_args');
  });

  it('attaches retry_args to every item when the whole save call throws', async () => {
    const client = setup({
      pending: [
        buildCandidate({ id: 'c1', title: 'T1' }),
        buildCandidate({ id: 'c2', title: 'T2' }),
      ],
      createMemos: (memos) => ({
        success: true,
        created_count: memos.length,
        failed_count: 0,
        created: [
          { index: 0, id: 100, title: 'T1' },
          { index: 1, id: 101, title: 'T2' },
        ],
        failed: [],
      }),
      saveError: new Error('save endpoint down'),
    });

    const result = await handleSavePendingCandidates(
      { candidates: [{ candidate_id: 'c1' }, { candidate_id: 'c2' }] },
      client,
    );

    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({
        index: 0,
        candidate_id: 'c1',
        status: 'failed',
        retry_args: { candidate_id: 'c1', saved_memo_id: 100 },
      }),
      expect.objectContaining({
        index: 1,
        candidate_id: 'c2',
        status: 'failed',
        retry_args: { candidate_id: 'c2', saved_memo_id: 101 },
      }),
    ]);
  });
});
