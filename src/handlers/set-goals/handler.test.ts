import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleSetGoals } from './handler.js';

describe('handleSetGoals', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({
        success: true,
        created_count: 0,
        updated_count: 0,
        deleted_count: 0,
        failed_count: 0,
        results: [],
        deleted_ids: [],
      }),
      delete: vi.fn(),
      ...overrides,
    } as unknown as ApiClient;
  }

  it('rejects arguments without a goals array', async () => {
    const client = createMockClient();

    expect((await handleSetGoals(undefined, client)).isError).toBe(true);
    expect(client.put).not.toHaveBeenCalled();
  });

  it('forwards the full normalized list when every item is valid', async () => {
    const client = createMockClient({
      put: vi.fn().mockResolvedValue({
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
      }),
    });

    const result = await handleSetGoals(
      {
        goals: [
          {
            id: 5,
            title: 'Existing',
            category: 'learning',
            status: 'active',
            priority: 1,
          },
          { title: 'New', category: 'career', status: 'active', priority: 2 },
        ],
      },
      client,
    );

    expect(client.put).toHaveBeenCalledTimes(1);
    expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/goals', {
      goals: [
        {
          id: 5,
          title: 'Existing',
          description: null,
          category: 'learning',
          status: 'active',
          priority: 1,
          target_date: null,
        },
        {
          title: 'New',
          description: null,
          category: 'career',
          status: 'active',
          priority: 2,
          target_date: null,
        },
      ],
    });
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      created_count: 1,
      updated_count: 1,
      deleted_count: 1,
      deleted_ids: [7],
    });
  });

  it('rejects the whole request without calling the API when any item is invalid', async () => {
    const client = createMockClient();

    const result = await handleSetGoals(
      {
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
      client,
    );

    // 全置換 sync でリスト外は削除されるため、1件でも不正なら何も変更しない。
    expect(client.put).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      created_count: 0,
      updated_count: 0,
      deleted_count: 0,
      failed_count: 2,
      deleted_ids: [],
    });
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, id: 5, action: 'failed' }),
      expect.objectContaining({
        index: 1,
        action: 'failed',
        error: 'title is required',
      }),
    ]);
  });

  it('rejects a non-numeric id instead of treating it as a new goal', async () => {
    const client = createMockClient();

    const result = await handleSetGoals(
      {
        goals: [
          {
            id: '5',
            title: 'Existing',
            category: 'learning',
            status: 'active',
            priority: 1,
          },
        ],
      },
      client,
    );

    // 文字列 id を「id なし作成」へ縮退させると全成功→リスト外削除で既存を消す。
    expect(client.put).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      deleted_ids: [],
    });
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results[0]).toMatchObject({
      index: 0,
      action: 'failed',
      error: 'id must be a positive integer',
    });
  });

  it('rejects an invalid optional field type without changing anything', async () => {
    const client = createMockClient();

    const result = await handleSetGoals(
      {
        goals: [
          {
            title: 'A',
            category: 'learning',
            status: 'active',
            priority: 1,
            target_date: 20260101,
          },
        ],
      },
      client,
    );

    expect(client.put).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results[0]).toMatchObject({ index: 0, action: 'failed' });
  });

  it('treats a non-object item as invalid and changes nothing', async () => {
    const client = createMockClient();

    const result = await handleSetGoals({ goals: ['broken'] }, client);

    expect(client.put).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results[0]).toMatchObject({
      index: 0,
      action: 'failed',
      error: 'Goal item must be an object',
    });
  });

  it('maps a whole-call API failure to all goals', async () => {
    const client = createMockClient({
      put: vi.fn().mockRejectedValue(new Error('server down')),
    });

    const result = await handleSetGoals(
      {
        goals: [
          { title: 'A', category: 'learning', status: 'active', priority: 1 },
        ],
      },
      client,
    );

    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      failed_count: 1,
      deleted_ids: [],
    });
    const results = (result.structuredContent as { results: unknown[] })
      .results;
    expect(results[0]).toMatchObject({
      index: 0,
      action: 'failed',
      error: 'server down',
    });
  });
});
