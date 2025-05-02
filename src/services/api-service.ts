import { CreateMemoParams, CreateMemoResponse } from '../types/index.js';

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
          content: params.content,
          is_public: params.is_public || false,
          categories: (params.categories || []).map((name: string) => ({
            name,
          })),
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
}
