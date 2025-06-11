// List ideas parameters
export interface ListIdeasParams {
  // No parameters for list ideas
}

export interface ListIdeasResponse {
  success: boolean;
  ideas: {
    id: number;
    title: string;
    sort: number;
  }[];
  error?: string;
}

// Create idea parameters
export interface CreateIdeaParams {
  title: string;
}

export interface CreateIdeaResponse {
  success: boolean;
  error?: string;
}

// Delete idea parameters
export interface DeleteIdeaParams {
  id: number;
}

export interface DeleteIdeaResponse {
  success: boolean;
  error?: string;
}
