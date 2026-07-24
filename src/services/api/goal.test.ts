import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from './client.js';
import { listGoals, setGoals } from './goal.js';

describe('goal API service', () => {
  it('lists goals from the MCP goals endpoint', async () => {
    const client = {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
    } as unknown as ApiClient;

    await listGoals(client);

    expect(client.get).toHaveBeenCalledWith('/api/v1/mcp/goals');
  });

  it('puts the full goal list to the bulk set endpoint', async () => {
    const client = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({
        success: true,
        created_count: 1,
        updated_count: 1,
        deleted_count: 0,
        failed_count: 0,
        results: [
          { index: 0, id: 1, action: 'updated', error: null },
          { index: 1, id: 2, action: 'created', error: null },
        ],
        deleted_ids: [],
      }),
      delete: vi.fn(),
    } as unknown as ApiClient;

    const goals = [
      {
        id: 1,
        title: 'Existing',
        description: null,
        category: 'learning' as const,
        status: 'active' as const,
        priority: 1,
        target_date: null,
      },
      {
        title: 'New',
        description: null,
        category: 'career' as const,
        status: 'active' as const,
        priority: 2,
        target_date: null,
      },
    ];

    const response = await setGoals(client, goals);

    expect(client.put).toHaveBeenCalledWith('/api/v1/mcp/goals', { goals });
    expect(response).toMatchObject({ success: true, created_count: 1 });
  });
});
