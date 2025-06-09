import {
  CreateMemoParams,
  CreateMemoResponse,
  SearchMemoParams,
  SearchMemoResponse,
} from '../types/index.js';

export class ApiService {
  private apiUrl: string;
  private apiKey: string;

  constructor(apiUrl: string, apiKey: string) {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async createMemo(params: CreateMemoParams): Promise<CreateMemoResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/memo`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          title: params.title,
          body: params.body,
          is_public: params.is_public || false,
          categories: params.categories || [],
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || '不明なエラー',
        };
      }

      return {
        success: true,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  async searchMemos(params: SearchMemoParams): Promise<SearchMemoResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.word) queryParams.append('word', params.word);
      if (params.category_id !== undefined)
        queryParams.append('category_id', params.category_id.toString());
      if (params.ids && params.ids.length > 0) {
        params.ids.forEach((id) => queryParams.append('ids[]', id.toString()));
      }
      if (params.is_public !== undefined)
        queryParams.append('is_public', params.is_public.toString());
      if (params.page !== undefined)
        queryParams.append('page', params.page.toString());
      if (params.limit !== undefined)
        queryParams.append('limit', params.limit.toString());

      const url = `${this.apiUrl}/api/v1/mcp/memos${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.error || '不明なエラー',
        };
      }

      return {
        success: true,
        memos: data.memos,
        total: data.total,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }
}
