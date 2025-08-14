import { ApiClient } from './client.js';
import { CategoriesResponse } from '../../types/index.js';

export async function getCategories(
  client: ApiClient,
): Promise<CategoriesResponse> {
  return client.get<CategoriesResponse>('/api/v1/mcp/categories');
}
