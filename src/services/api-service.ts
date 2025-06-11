import {
  CreateMemoParams,
  CreateMemoResponse,
  SearchMemoParams,
  SearchMemoResponse,
  GetMemoParams,
  GetMemoResponse,
  UpdateMemoParams,
  UpdateMemoResponse,
  DeleteMemoParams,
  DeleteMemoResponse,
  CategoriesResponse,
  CreateNoteParams,
  CreateNoteResponse,
  SearchNotesParams,
  SearchNotesResponse,
  GetNoteParams,
  GetNoteResponse,
  UpdateNoteParams,
  UpdateNoteResponse,
  DeleteNoteParams,
  DeleteNoteResponse,
  ListIdeasResponse,
  CreateIdeaParams,
  CreateIdeaResponse,
  DeleteIdeaParams,
  DeleteIdeaResponse,
  GetSkillSheetResponse,
  CreateSkillSheetParams,
  CreateSkillSheetResponse,
  UpdateSkillSheetParams,
  UpdateSkillSheetResponse,
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

  async getMemo(params: GetMemoParams): Promise<GetMemoResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/mcp/memo/${params.id}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to get memo: ${response.status}`);
    }

    return await response.json();
  }

  async updateMemo(params: UpdateMemoParams): Promise<UpdateMemoResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/memo`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          id: params.id,
          title: params.title,
          body: params.body,
          is_public: params.is_public,
          categories: params.categories,
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

  async deleteMemo(params: DeleteMemoParams): Promise<DeleteMemoResponse> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/mcp/memo/${params.id}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error || `Failed to delete memo: ${response.status}`,
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

  async getCategories(): Promise<CategoriesResponse> {
    const response = await fetch(`${this.apiUrl}/api/v1/mcp/categories`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        data.error || `Failed to get categories: ${response.status}`,
      );
    }

    return await response.json();
  }

  // Note APIs
  async createNote(params: CreateNoteParams): Promise<CreateNoteResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/note`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          title: params.title,
          is_public: params.is_public || false,
          memos: params.memos || [],
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
        id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  async searchNotes(params: SearchNotesParams): Promise<SearchNotesResponse> {
    try {
      const queryParams = new URLSearchParams();

      if (params.word) queryParams.append('word', params.word);
      if (params.is_public !== undefined)
        queryParams.append('is_public', params.is_public.toString());
      if (params.page !== undefined)
        queryParams.append('page', params.page.toString());
      if (params.limit !== undefined)
        queryParams.append('limit', params.limit.toString());

      const url = `${this.apiUrl}/api/v1/mcp/notes${queryParams.toString() ? '?' + queryParams.toString() : ''}`;

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
        notes: data.notes,
        total: data.total,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  async getNote(params: GetNoteParams): Promise<GetNoteResponse> {
    const response = await fetch(
      `${this.apiUrl}/api/v1/mcp/note/${params.id}`,
      {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      },
    );

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || `Failed to get note: ${response.status}`);
    }

    return await response.json();
  }

  async updateNote(params: UpdateNoteParams): Promise<UpdateNoteResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/note`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          id: params.id,
          title: params.title,
          is_public: params.is_public,
          memos: params.memos,
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

  async deleteNote(params: DeleteNoteParams): Promise<DeleteNoteResponse> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/mcp/note/${params.id}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error || `Failed to delete note: ${response.status}`,
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

  // Idea APIs
  async listIdeas(): Promise<ListIdeasResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/ideas`, {
        method: 'GET',
        headers: {
          'X-API-Key': this.apiKey,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          ideas: [],
          error: data.error || '不明なエラー',
        };
      }

      return {
        success: true,
        ideas: data,
      };
    } catch (error) {
      return {
        success: false,
        ideas: [],
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  async createIdea(params: CreateIdeaParams): Promise<CreateIdeaResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/idea`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          title: params.title,
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

  async deleteIdea(params: DeleteIdeaParams): Promise<DeleteIdeaResponse> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/mcp/idea/${params.id}`,
        {
          method: 'DELETE',
          headers: {
            'X-API-Key': this.apiKey,
          },
        },
      );

      if (!response.ok) {
        const data = await response.json();
        return {
          success: false,
          error: data.error || `Failed to delete idea: ${response.status}`,
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

  // Skill Sheet APIs
  async getSkillSheet(): Promise<GetSkillSheetResponse> {
    const response = await fetch(`${this.apiUrl}/api/v1/mcp/skill-sheet`, {
      method: 'GET',
      headers: {
        'X-API-Key': this.apiKey,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(
        data.error || `Failed to get skill sheet: ${response.status}`,
      );
    }

    const data = await response.json();
    
    // Validate the response has the expected structure
    if (!data || typeof data.id !== 'number') {
      throw new Error('Invalid skill sheet response format');
    }

    return data as GetSkillSheetResponse;
  }

  async createSkillSheet(
    params: CreateSkillSheetParams,
  ): Promise<CreateSkillSheetResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/skill-sheet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          nearest_station: params.nearest_station,
          gender: params.gender,
          birth_date: params.birth_date,
          years_of_experience: params.years_of_experience,
          self_pr: params.self_pr,
          skills: params.skills,
          projects: params.projects,
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
        id: data.id,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '不明なエラー',
      };
    }
  }

  async updateSkillSheet(
    params: UpdateSkillSheetParams,
  ): Promise<UpdateSkillSheetResponse> {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/mcp/skill-sheet`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.apiKey,
        },
        body: JSON.stringify({
          nearest_station: params.nearest_station,
          gender: params.gender,
          birth_date: params.birth_date,
          years_of_experience: params.years_of_experience,
          self_pr: params.self_pr,
          skills: params.skills,
          projects: params.projects,
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
