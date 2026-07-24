import { ApiClient } from './client.js';
import type {
  Goal,
  SetGoalInput,
  SetGoalsResponse,
} from '../../types/index.js';

export async function listGoals(client: ApiClient): Promise<Goal[]> {
  return client.get<Goal[]>('/api/v1/mcp/goals');
}

export async function setGoals(
  client: ApiClient,
  goals: SetGoalInput[],
): Promise<SetGoalsResponse> {
  return client.put<SetGoalsResponse>('/api/v1/mcp/goals', { goals });
}
