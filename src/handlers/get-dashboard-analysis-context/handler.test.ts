import { describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleGetDashboardAnalysisContext } from './handler.js';

describe('handleGetDashboardAnalysisContext', () => {
  it('hydrates recent memo bodies through an ids request', async () => {
    const get = vi.fn(async (endpoint: string) => {
      switch (endpoint) {
        case '/api/v1/mcp/dashboard':
          return {
            total_memo_count: 1,
            total_note_count: 0,
            activities: [],
            category_item_counts: [],
            category_relations: [],
            category_timeline_data: [],
            memo_type_counts: [{ key: 'decision', count: 1 }],
            recent_memo_count: 1,
            last_memo_created_at: null,
            active_days_in_last_30_days: 1,
          };
        case '/api/v1/mcp/goals':
          return [];
        case '/api/v1/mcp/skill-sheet':
          return {
            id: 1,
            nearest_station: null,
            gender: 0,
            birth_date: '',
            years_of_experience: 0,
            self_pr: null,
            skills: [],
            projects: [],
          };
        case '/api/v1/mcp/memos?page=1&limit=20':
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
                projects: [],
                user: { id: 1, user_id: 'user', name: 'User', picture: null },
              },
            ],
            total: 1,
            search_mode: 'filter',
          };
        case '/api/v1/mcp/memos?ids=42':
          return {
            memos: [{ id: 42, body: 'Hydrated dashboard body' }],
            total: 1,
            search_mode: 'filter',
          };
        case '/api/v1/mcp/notes?page=1&limit=20':
          return { notes: [], total: 0 };
        case '/api/v1/mcp/categories':
          return [];
        case '/api/v1/mcp/dashboard-analysis':
          return null;
        default:
          throw new Error(`Unexpected endpoint: ${endpoint}`);
      }
    });
    const client = { get } as unknown as ApiClient;

    const result = await handleGetDashboardAnalysisContext(undefined, client);

    expect(get).toHaveBeenCalledWith('/api/v1/mcp/memos?page=1&limit=20');
    expect(get).toHaveBeenCalledWith('/api/v1/mcp/memos?ids=42');
    expect(result).toHaveProperty(
      'structuredContent.recent_memos.0.body',
      'Hydrated dashboard body',
    );
  });
});
