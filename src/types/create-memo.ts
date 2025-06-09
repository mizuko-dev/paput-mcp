export interface CreateMemoParams {
  title: string;
  body: string;
  is_public?: boolean;
  categories?: Array<{ id?: number; name: string }>;
}

export interface CreateMemoResponse {
  success: boolean;
  error?: string;
}
