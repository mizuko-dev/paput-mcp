import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleUpsertSkillSheetProjects } from './handler.js';

describe('handleUpsertSkillSheetProjects', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function validProject(overrides: Record<string, unknown> = {}) {
    return {
      type: 1,
      title: 'PaPut',
      start_period: '2026-01',
      description: 'desc',
      role: 'dev',
      scale: 'solo',
      technologies: [{ name: 'Go' }],
      processes: [4],
      memos: [],
      ...overrides,
    };
  }

  function createMockClient(overrides: Partial<Record<string, unknown>> = {}) {
    return {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 0,
        updated_count: 0,
        failed_count: 0,
        results: [],
      }),
      put: vi.fn(),
      delete: vi.fn(),
      ...overrides,
    } as unknown as ApiClient;
  }

  it('rejects arguments without a projects array', async () => {
    const client = createMockClient();

    expect(
      (await handleUpsertSkillSheetProjects(undefined, client)).isError,
    ).toBe(true);
    expect(
      (await handleUpsertSkillSheetProjects({ projects: 5 }, client)).isError,
    ).toBe(true);
    expect(client.post).not.toHaveBeenCalled();
  });

  it('forwards valid projects in one API call and reports counts', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 1,
        updated_count: 1,
        failed_count: 0,
        results: [
          { index: 0, id: 10, title: 'PaPut', action: 'created', error: null },
          { index: 1, id: 11, title: 'Other', action: 'updated', error: null },
        ],
      }),
    });

    const result = await handleUpsertSkillSheetProjects(
      {
        projects: [validProject(), validProject({ id: 11, title: 'Other' })],
      },
      client,
    );

    expect(client.post).toHaveBeenCalledTimes(1);
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects',
      { projects: [expect.objectContaining({ title: 'PaPut' }), expect.objectContaining({ id: 11 })] },
    );
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      created_count: 1,
      updated_count: 1,
      failed_count: 0,
    });
  });

  it('drops invalid items before the API call and remaps results', async () => {
    const client = createMockClient({
      post: vi.fn().mockResolvedValue({
        success: true,
        created_count: 1,
        updated_count: 0,
        failed_count: 0,
        results: [
          { index: 0, id: 20, title: 'PaPut', action: 'created', error: null },
        ],
      }),
    });

    const result = await handleUpsertSkillSheetProjects(
      {
        projects: [
          'broken',
          { title: 'incomplete' },
          validProject(),
        ],
      },
      client,
    );

    // 正常分のみ API へ。
    expect(client.post).toHaveBeenCalledWith(
      '/api/v1/mcp/skill-sheet/projects',
      { projects: [expect.objectContaining({ title: 'PaPut' })] },
    );
    expect(result.isError).toBe(true);
    expect(result.structuredContent).toMatchObject({
      success: false,
      created_count: 1,
      failed_count: 2,
    });
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, action: 'failed' }),
      expect.objectContaining({
        index: 1,
        action: 'failed',
        title: 'incomplete',
      }),
      expect.objectContaining({ index: 2, action: 'created', id: 20 }),
    ]);
  });

  it('maps a whole-call API failure to all valid items', async () => {
    const client = createMockClient({
      post: vi.fn().mockRejectedValue(new Error('boom')),
    });

    const result = await handleUpsertSkillSheetProjects(
      { projects: [validProject({ id: 3 })] },
      client,
    );

    expect(result.isError).toBe(true);
    const results = (result.structuredContent as { results: unknown[] }).results;
    expect(results).toEqual([
      expect.objectContaining({ index: 0, id: 3, action: 'failed', error: 'boom' }),
    ]);
  });

  it('succeeds without calling the API when projects is empty', async () => {
    const client = createMockClient();

    const result = await handleUpsertSkillSheetProjects(
      { projects: [] },
      client,
    );

    expect(client.post).not.toHaveBeenCalled();
    expect(result.isError).toBe(false);
    expect(result.structuredContent).toMatchObject({
      success: true,
      created_count: 0,
      updated_count: 0,
      failed_count: 0,
    });
  });
});
