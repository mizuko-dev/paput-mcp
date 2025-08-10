export interface CreateMemoParams {
  title: string;
  body: string;
  is_public?: boolean;
  categories?: Array<{ id?: number; name: string }>;
  projects?: Array<{ id: number; title?: string }>;
}

export interface CreateMemoResponse {
  success: boolean;
  error?: string;
}
