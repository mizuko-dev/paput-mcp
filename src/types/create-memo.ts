export interface CreateMemoParams {
  title: string;
  content: string;
  is_public?: boolean;
  categories?: string[];
}

export interface CreateMemoResponse {
  success: boolean;
  error?: string;
}
