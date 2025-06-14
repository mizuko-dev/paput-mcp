export interface UpdateMemoParams {
  id: number;
  title: string;
  body: string;
  is_public: boolean;
  categories: Array<{
    id?: number;
    name: string;
  }>;
}

export interface UpdateMemoResponse {
  success: boolean;
  error?: string;
}
