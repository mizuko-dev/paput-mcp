export type GoalCategory =
  | 'career'
  | 'learning'
  | 'portfolio'
  | 'project'
  | 'other';

export type GoalStatus = 'active' | 'archived';

export interface Goal {
  id: number;
  title: string;
  description: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: number;
  target_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetGoalInput {
  id?: number;
  title: string;
  description?: string | null;
  category: GoalCategory;
  status: GoalStatus;
  priority: number;
  target_date?: string | null;
}

export interface SetGoalResult {
  index: number;
  id: number | null;
  action: 'created' | 'updated' | 'failed';
  error: string | null;
}

export interface SetGoalsResponse {
  success: boolean;
  created_count: number;
  updated_count: number;
  deleted_count: number;
  failed_count: number;
  results: SetGoalResult[];
  deleted_ids: number[];
}
