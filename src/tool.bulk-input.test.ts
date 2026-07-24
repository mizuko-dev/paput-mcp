import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { setupTool } from './tool.js';

// must-fix 1 の実経路検証: setupTool の実行時 Zod 検証（トップレベル）を通過して
// handler の per-item 検証に到達し、混在入力（正常＋不正）で不正だけ failed、
// 正常分だけ API へ渡り、元 index が保持されることを確認する。

const API_URL = 'http://localhost:4123';
const TOKEN = 'test-token';

type FetchCall = { url: string; method: string; body: unknown };

function installFetch(
  routes: Array<{
    match: (url: string, method: string) => boolean;
    payload: unknown;
  }>,
): { calls: FetchCall[] } {
  const calls: FetchCall[] = [];
  const fetchMock = vi.fn(async (url: string, options: RequestInit = {}) => {
    const method = options.method ?? 'GET';
    const body =
      typeof options.body === 'string' ? JSON.parse(options.body) : undefined;
    calls.push({ url, method, body });
    const route = routes.find((r) => r.match(url, method));
    if (!route) {
      return new Response(
        JSON.stringify({ error: `no route for ${method} ${url}` }),
        {
          status: 500,
        },
      );
    }
    return new Response(JSON.stringify(route.payload), { status: 200 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return { calls };
}

function captureCallTool() {
  const handlers = new Map<
    unknown,
    (request: unknown) => Promise<Record<string, unknown>>
  >();
  const fakeServer = {
    setRequestHandler: (
      schema: unknown,
      fn: (request: unknown) => Promise<Record<string, unknown>>,
    ) => {
      handlers.set(schema, fn);
    },
  } as unknown as Server;

  setupTool(fakeServer, API_URL, TOKEN, {});
  const callTool = handlers.get(CallToolRequestSchema);
  if (!callTool) throw new Error('CallTool handler not registered');
  return callTool;
}

describe('bulk tools tolerate mixed input through setupTool', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('mark_processed_sessions: invalid element does not block the valid one', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'POST' && url.endsWith('/api/v1/mcp/processed-sessions'),
        payload: {
          success: true,
          marked_count: 1,
          failed_count: 0,
          results: [
            { index: 0, session_id: 'a', status: 'marked', error: null },
          ],
        },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_mark_processed_sessions',
        arguments: {
          sessions: [
            { source: 'claude', session_id: 'a' },
            { source: 'cursor', session_id: 'b' },
          ],
        },
      },
    });

    // 実経路で "Invalid arguments" のツール全体エラーにならないこと。
    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    // 正常分のみ API へ。
    const apiCalls = calls.filter((c) => c.method === 'POST');
    expect(apiCalls).toHaveLength(1);
    expect(apiCalls[0].body).toEqual({
      sessions: [{ source: 'claude', session_id: 'a' }],
    });
    expect(result.structuredContent).toMatchObject({
      marked_count: 1,
      failed_count: 1,
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({ index: 0, status: 'marked' });
    expect(results[1]).toMatchObject({ index: 1, status: 'failed' });
  });

  it('upsert_skill_sheet_projects: invalid element does not block the valid one', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'POST' && url.endsWith('/api/v1/mcp/skill-sheet/projects'),
        payload: {
          success: true,
          created_count: 1,
          updated_count: 0,
          failed_count: 0,
          results: [
            {
              index: 0,
              id: 10,
              title: 'PaPut',
              action: 'created',
              error: null,
            },
          ],
        },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_upsert_skill_sheet_projects',
        arguments: {
          projects: [
            {
              type: 1,
              title: 'PaPut',
              start_period: '2026-01',
              description: 'desc',
              role: 'dev',
              scale: 'solo',
              technologies: [{ name: 'Go' }],
              processes: [4],
              memos: [],
            },
            { title: 'incomplete' },
          ],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    const apiCalls = calls.filter((c) => c.method === 'POST');
    expect(apiCalls).toHaveLength(1);
    expect((apiCalls[0].body as { projects: unknown[] }).projects).toHaveLength(
      1,
    );
    expect(result.structuredContent).toMatchObject({
      created_count: 1,
      failed_count: 1,
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({ index: 0, action: 'created' });
    expect(results[1]).toMatchObject({ index: 1, action: 'failed' });
  });

  it('discard_pending_candidates: invalid element does not block the valid one', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'PUT' &&
          url.endsWith('/api/v1/mcp/knowledge-candidates/discard'),
        payload: {
          success: true,
          discarded_count: 1,
          failed_count: 0,
          results: [
            { index: 0, candidate_id: 'c1', status: 'discarded', error: null },
          ],
        },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_discard_pending_candidates',
        arguments: {
          candidates: [{ candidate_id: 'c1' }, { reason: 'no id' }],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    const putCalls = calls.filter((c) => c.method === 'PUT');
    expect(putCalls).toHaveLength(1);
    expect(putCalls[0].url).toContain(
      '/api/v1/mcp/knowledge-candidates/discard',
    );
    expect((putCalls[0].body as { candidates: unknown[] }).candidates).toEqual([
      { candidate_id: 'c1', reason: undefined },
    ]);
    expect(result.structuredContent).toMatchObject({
      discarded_count: 1,
      failed_count: 1,
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({ index: 0, status: 'discarded' });
    expect(results[1]).toMatchObject({ index: 1, status: 'failed' });
  });

  it('update_pending_candidates: invalid element does not block the valid one', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'PUT' && url.endsWith('/api/v1/mcp/knowledge-candidates'),
        payload: {
          success: true,
          updated_count: 1,
          failed_count: 0,
          results: [
            { index: 0, candidate_id: 'c1', status: 'updated', error: null },
          ],
        },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_update_pending_candidates',
        arguments: {
          candidates: [
            { candidate_id: 'c1', title: 'Refined title' },
            { title: 'no id' },
          ],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    const putCalls = calls.filter((c) => c.method === 'PUT');
    expect(putCalls).toHaveLength(1);
    expect((putCalls[0].body as { candidates: unknown[] }).candidates).toEqual([
      { candidate_id: 'c1', title: 'Refined title' },
    ]);
    expect(result.structuredContent).toMatchObject({
      updated_count: 1,
      failed_count: 1,
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({ index: 0, status: 'updated' });
    expect(results[1]).toMatchObject({ index: 1, status: 'failed' });
  });

  it('set_goals: forwards the full valid list and maps results by index', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'PUT' && url.endsWith('/api/v1/mcp/goals'),
        payload: {
          success: true,
          created_count: 1,
          updated_count: 1,
          deleted_count: 1,
          failed_count: 0,
          results: [
            { index: 0, id: 5, action: 'updated', error: null },
            { index: 1, id: 9, action: 'created', error: null },
          ],
          deleted_ids: [7],
        },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_set_goals',
        arguments: {
          goals: [
            {
              id: 5,
              title: 'Existing',
              category: 'learning',
              status: 'active',
              priority: 1,
            },
            {
              title: 'New',
              category: 'career',
              status: 'active',
              priority: 2,
            },
          ],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    const putCalls = calls.filter((c) => c.method === 'PUT');
    expect(putCalls).toHaveLength(1);
    expect((putCalls[0].body as { goals: unknown[] }).goals).toHaveLength(2);
    expect(result.structuredContent).toMatchObject({
      success: true,
      created_count: 1,
      updated_count: 1,
      deleted_count: 1,
      deleted_ids: [7],
    });
  });

  it('set_goals: rejects the whole request without calling the API when any item is invalid', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'PUT' && url.endsWith('/api/v1/mcp/goals'),
        payload: { success: true },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_set_goals',
        arguments: {
          goals: [
            {
              id: 5,
              title: 'Existing',
              category: 'learning',
              status: 'active',
              priority: 1,
            },
            { title: '', category: 'career', status: 'active', priority: 2 },
          ],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    // 不正要素が1件でもあれば、意図しない削除を避けるため API は呼ばれない。
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(result.structuredContent).toMatchObject({
      success: false,
      created_count: 0,
      updated_count: 0,
      deleted_count: 0,
      failed_count: 2,
      deleted_ids: [],
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({ index: 0, action: 'failed' });
    expect(results[1]).toMatchObject({ index: 1, action: 'failed' });
  });

  it('set_goals: a string id or bad optional field aborts the whole sync (no API call)', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'PUT' && url.endsWith('/api/v1/mcp/goals'),
        payload: { success: true },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_set_goals',
        arguments: {
          goals: [
            {
              id: '5',
              title: 'String id',
              category: 'learning',
              status: 'active',
              priority: 1,
            },
            {
              title: 'Bad optional',
              category: 'career',
              status: 'active',
              priority: 2,
              description: 123,
            },
          ],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    // 文字列 id を「作成」へ縮退させず、不正任意フィールドも弾く。削除は起きない。
    expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    expect(result.structuredContent).toMatchObject({
      success: false,
      created_count: 0,
      updated_count: 0,
      deleted_count: 0,
      failed_count: 2,
      deleted_ids: [],
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({ index: 0, action: 'failed' });
    expect(results[1]).toMatchObject({ index: 1, action: 'failed' });
  });

  it('save_pending_candidates: invalid element does not block the valid one', async () => {
    const { calls } = installFetch([
      {
        match: (url, method) =>
          method === 'GET' && url.includes('/api/v1/mcp/knowledge-candidates'),
        payload: {
          count: 1,
          candidates: [
            {
              id: 'c1',
              session_id: 's1',
              source: 'codex',
              title: 'T1',
              body: 'B1',
              categories: [],
              projects: [],
              status: 'pending',
              fingerprint: 'fp',
              similar_memos: [],
              created_at: '2026-06-01T10:00:00.000Z',
              updated_at: '2026-06-01T10:00:00.000Z',
            },
          ],
        },
      },
      {
        match: (url, method) =>
          method === 'POST' && url.endsWith('/api/v1/mcp/memos'),
        payload: {
          success: true,
          created_count: 1,
          failed_count: 0,
          created: [{ index: 0, id: 100, title: 'T1' }],
          failed: [],
        },
      },
      {
        match: (url, method) =>
          method === 'PUT' &&
          url.endsWith('/api/v1/mcp/knowledge-candidates/save'),
        payload: {
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
        },
      },
    ]);
    const callTool = captureCallTool();

    const result = await callTool({
      params: {
        name: 'paput_save_pending_candidates',
        arguments: {
          candidates: [{ candidate_id: 'c1' }, { title: 'no id' }],
        },
      },
    });

    expect(JSON.stringify(result.content)).not.toContain('Invalid arguments');
    // 正常分のみ save の PUT へ渡る。
    const putCalls = calls.filter((c) => c.method === 'PUT');
    expect(putCalls).toHaveLength(1);
    expect(
      (putCalls[0].body as { candidates: unknown[] }).candidates,
    ).toHaveLength(1);
    expect(result.structuredContent).toMatchObject({
      saved_count: 1,
      failed_count: 1,
    });
    const results = (
      result.structuredContent as { results: Array<Record<string, unknown>> }
    ).results;
    expect(results[0]).toMatchObject({
      index: 0,
      candidate_id: 'c1',
      status: 'saved',
    });
    expect(results[1]).toMatchObject({ index: 1, status: 'failed' });
  });
});
