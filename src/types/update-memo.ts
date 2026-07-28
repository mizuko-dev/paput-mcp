export interface UpdateMemoParams {
  id: number;
  title: string;
  summary?: string;
  body: string;
  is_public: boolean;
  categories: Array<{
    id?: number;
    name: string;
  }>;
  memo_type_keys?: string[];
  projects?: Array<{ id: number; title?: string }>;
}

export interface UpdateMemoResponse {
  success: boolean;
  error?: string;
}
