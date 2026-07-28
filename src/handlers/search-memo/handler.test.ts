import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleSearchMemo } from './handler.js';

describe('handleSearchMemo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient(response: unknown | Error) {
    return {
      get:
        response instanceof Error
          ? vi.fn().mockRejectedValue(response)
          : vi.fn().mockResolvedValue(response),
    } as unknown as ApiClient;
  }

  it('builds the search query from validated arguments', async () => {
    const client = createMockClient({
      memos: [],
      total: 0,
      search_mode: 'filter',
    });

    await handleSearchMemo(
      {
        query: 'go',
        category_id: 2,
        ids: [1, 'x', 2],
        is_public: true,
        project_id: 9,
        page: 1,
        limit: 5,
        unknown_key: 'ignored',
      },
      client,
    );

    expect(client.get).toHaveBeenCalledWith(
      '/api/v1/mcp/memos?query=go&category_id=2&ids=1&ids=2&is_public=true&project_id=9&page=1&limit=5',
    );
  });

  it('ignores arguments with invalid types', async () => {
    const client = createMockClient({
      memos: [],
      total: 0,
      search_mode: 'filter',
    });

    await handleSearchMemo(
      { query: 1, category_id: '2', is_public: 'yes' },
      client,
    );

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/memos');
  });

  it('returns a formatted list of matched memos without match info in filter mode', async () => {
    const memo = {
      id: 1,
      title: 'Go context',
      summary: 'Stored summary',
      body: 'Body',
      is_public: false,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      categories: [{ id: 1, name: 'Go' }],
    };
    const client = createMockClient({
      memos: [memo],
      total: 1,
      search_mode: 'filter',
    });

    const result = await handleSearchMemo({ category_id: 1 }, client);

    expect(result.isError).toBeUndefined();
    expect(result.structuredContent).toEqual({
      total: 1,
      memos: [
        {
          id: 1,
          title: 'Go context',
          summary: 'Stored summary',
          is_public: false,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
          categories: [{ id: 1, name: 'Go' }],
        },
      ],
      search_mode: 'filter',
    });
    expect(result.structuredContent.memos[0]).not.toHaveProperty('body');
    expect(result.content[0].text).toContain('【Go context】(ID: 1, Private)');
    expect(result.content[0].text).toContain('Categories: Go');
    expect(result.content[0].text).toContain('Summary: Stored summary');
    expect(result.content[0].text).not.toContain('Body');
    expect(result.content[0].text).not.toContain('keyword match');
  });

  it('returns body only when ids are specified', async () => {
    const memo = {
      id: 1,
      title: 'Selected memo',
      summary: 'Selected summary',
      body: 'Selected body',
      is_public: true,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      categories: [],
      memo_types: [],
    };
    const client = createMockClient({
      memos: [memo],
      total: 1,
      search_mode: 'filter',
    });

    const result = await handleSearchMemo({ ids: [1] }, client);

    expect(result.structuredContent?.memos).toEqual([memo]);
    expect(result.content[0].text).toContain('Body:\nSelected body');
  });

  it('formats hybrid results with score or keyword match', async () => {
    const withScore = {
      id: 1,
      title: 'Semantic hit',
      summary: 'Semantic summary',
      body: 'Body',
      is_public: true,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      categories: [],
      score: 0.812345,
    };
    const keywordOnly = {
      id: 2,
      title: 'Keyword hit',
      summary: 'Keyword summary',
      body: 'Body',
      is_public: true,
      created_at: '2026-06-01T00:00:00Z',
      updated_at: '2026-06-01T00:00:00Z',
      categories: [],
    };
    const client = createMockClient({
      memos: [withScore, keywordOnly],
      total: 2,
      search_mode: 'hybrid',
    });

    const result = await handleSearchMemo({ query: 'atomic write' }, client);

    expect(result.structuredContent).toEqual({
      total: 2,
      memos: [
        {
          id: 1,
          title: 'Semantic hit',
          summary: 'Semantic summary',
          is_public: true,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
          categories: [],
          score: 0.812345,
        },
        {
          id: 2,
          title: 'Keyword hit',
          summary: 'Keyword summary',
          is_public: true,
          created_at: '2026-06-01T00:00:00Z',
          updated_at: '2026-06-01T00:00:00Z',
          categories: [],
        },
      ],
      search_mode: 'hybrid',
    });
    expect(result.content[0].text).toContain('search_mode: hybrid');
    expect(result.content[0].text).toContain('Score: 0.812');
    expect(result.content[0].text).toContain('keyword match');
  });

  it('reports when no memos match', async () => {
    const client = createMockClient({
      memos: [],
      total: 0,
      search_mode: 'filter',
    });

    const result = await handleSearchMemo({}, client);

    expect(result.structuredContent).toEqual({
      total: 0,
      memos: [],
      search_mode: 'filter',
    });
    expect(result.content[0].text).toBe('No matching memos found.');
  });

  it('returns an error result when the API call fails', async () => {
    const client = createMockClient(new Error('api down'));

    const result = await handleSearchMemo({}, client);

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('api down');
  });
});
