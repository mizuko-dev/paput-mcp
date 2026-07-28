import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ApiClient } from '../../services/api/client.js';
import { handleUpdateMemo } from './handler.js';

describe('handleUpdateMemo', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function createMockClient() {
    return {
      get: vi.fn().mockResolvedValue([]),
      post: vi.fn(),
      put: vi.fn().mockResolvedValue({}),
      delete: vi.fn(),
    } as unknown as ApiClient;
  }

  function putBody(client: ApiClient) {
    const [, body] = (client.put as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    return body;
  }

  it('forwards summary to the API body', async () => {
    const client = createMockClient();

    await handleUpdateMemo(
      {
        id: 1,
        title: 'タイトル',
        summary: '一行要約',
        body: '本文',
        is_public: false,
      },
      client,
    );

    expect(putBody(client).summary).toBe('一行要約');
  });

  it('sends an empty summary when it is omitted', async () => {
    const client = createMockClient();

    await handleUpdateMemo(
      { id: 1, title: 'タイトル', body: '本文', is_public: false },
      client,
    );

    expect(putBody(client).summary).toBe('');
  });
});
