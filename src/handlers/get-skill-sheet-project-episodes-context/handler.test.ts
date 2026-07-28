import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handler } from './handler.js';

describe('get skill sheet project episodes context handler', () => {
  it('hydrates public memo bodies through ids and keeps them in the prompt', async () => {
    const get = vi.fn(async (endpoint: string) => {
      switch (endpoint) {
        case '/api/v1/mcp/skill-sheet':
          return {
            id: 1,
            nearest_station: null,
            gender: 0,
            birth_date: '',
            years_of_experience: 0,
            self_pr: null,
            skills: [],
            projects: [
              {
                id: 7,
                type: 1,
                title: 'Boundary project',
                start_period: '2026-01-01',
                end_period: null,
                description: 'Project description',
                role: 'Backend',
                scale: 'Small',
                technologies: [],
                processes: [],
                memos: [],
                episodes: [],
                achievements: [],
              },
            ],
          };
        case '/api/v1/mcp/memos?is_public=true&project_id=7&page=1&limit=100':
          return {
            memos: [
              {
                id: 42,
                title: 'Indexed decision',
                summary: 'Index summary',
                is_public: true,
                created_at: '2026-07-29 00:00:00',
                updated_at: '2026-07-29 00:00:00',
                categories: [],
                memo_types: [{ id: 1, key: 'decision' }],
                projects: [{ id: 7, title: 'Boundary project' }],
                user: { id: 1, user_id: 'user', name: 'User', picture: null },
              },
            ],
            total: 1,
            search_mode: 'filter',
          };
        case '/api/v1/mcp/memos?ids=42':
          return {
            memos: [{ id: 42, body: 'Hydrated episode body' }],
            total: 1,
            search_mode: 'filter',
          };
        case '/api/v1/mcp/memos?is_public=false&project_id=7&page=1&limit=1':
          return { memos: [], total: 0, search_mode: 'filter' };
        default:
          throw new Error(`Unexpected endpoint: ${endpoint}`);
      }
    });
    const client = { get } as unknown as ApiClient;

    const result = await handler({ project_id: 7 }, client);

    expect(get).toHaveBeenCalledWith(
      '/api/v1/mcp/memos?is_public=true&project_id=7&page=1&limit=100',
    );
    expect(get).toHaveBeenCalledWith('/api/v1/mcp/memos?ids=42');
    expect(result).toHaveProperty(
      'structuredContent.public_memos.0.body',
      'Hydrated episode body',
    );
    expect(result).toHaveProperty(
      'structuredContent.prompt',
      expect.stringContaining('Body:\nHydrated episode body'),
    );
  });
});
