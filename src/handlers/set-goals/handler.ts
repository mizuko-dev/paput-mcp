import { ApiClient } from '../../services/api/client.js';
import { setGoals } from '../../services/api/goal.js';
import type {
  GoalCategory,
  GoalStatus,
  SetGoalInput,
  SetGoalResult,
} from '../../types/index.js';

const goalCategories = ['career', 'learning', 'portfolio', 'project', 'other'];
const goalStatuses = ['active', 'archived'];

type ItemParse =
  | { ok: true; goal: SetGoalInput }
  | { ok: false; id: number | null; error: string };

export async function handleSetGoals(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || !Array.isArray(args.goals)) {
    return {
      content: [{ type: 'text', text: 'goals must be an array' }],
      isError: true,
    };
  }

  // 実経路では bulkItemsSchema(min 1) が空配列を弾くが、直接呼び出しへの防御。
  if (args.goals.length === 0) {
    return {
      content: [{ type: 'text', text: 'goals must not be empty' }],
      isError: true,
    };
  }

  const parsed = args.goals.map((raw) => parseGoal(raw));

  // set_goals は全置換 sync（入力リストに無い既存 goal は削除）で不可逆。
  // 1件でもローカル検証に失敗したら、部分適用による意図しない削除を避けるため
  // API を呼ばず何も変更しない。全件正常なときだけ全件をそのまま API へ渡す。
  const hasInvalid = parsed.some((item) => !item.ok);
  if (hasInvalid) {
    const results: SetGoalResult[] = parsed.map((item, index) =>
      item.ok
        ? {
            index,
            id: item.goal.id ?? null,
            action: 'failed',
            error:
              'Not applied: another goal in this request was invalid, so no goals were changed to avoid unintended deletions.',
          }
        : { index, id: item.id, action: 'failed', error: item.error },
    );
    const response = {
      success: false,
      created_count: 0,
      updated_count: 0,
      deleted_count: 0,
      failed_count: results.length,
      results,
      deleted_ids: [] as number[],
    };
    return {
      structuredContent: response,
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      isError: true,
    };
  }

  const goals = parsed.map(
    (item) => (item as { ok: true; goal: SetGoalInput }).goal,
  );

  try {
    const response = await setGoals(apiClient, goals);
    return {
      structuredContent: response as unknown as Record<string, unknown>,
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      isError: response.failed_count > 0,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const results: SetGoalResult[] = goals.map((goal, index) => ({
      index,
      id: goal.id ?? null,
      action: 'failed',
      error: message,
    }));
    const response = {
      success: false,
      created_count: 0,
      updated_count: 0,
      deleted_count: 0,
      failed_count: results.length,
      results,
      deleted_ids: [] as number[],
    };
    return {
      structuredContent: response,
      content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
      isError: true,
    };
  }
}

function parseGoal(raw: unknown): ItemParse {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, id: null, error: 'Goal item must be an object' };
  }

  const item = raw as Record<string, unknown>;

  // id はキー存在時に正の整数のみ許可する。文字列 id 等を黙って null(=作成)へ
  // 縮退させると、全成功時にリスト外削除で既存 goal を消してしまう（安全弁の迂回）。
  let id: number | null = null;
  if ('id' in item && item.id !== undefined) {
    if (
      typeof item.id !== 'number' ||
      !Number.isInteger(item.id) ||
      item.id <= 0
    ) {
      return { ok: false, id: null, error: 'id must be a positive integer' };
    }
    id = item.id;
  }

  if (typeof item.title !== 'string' || item.title.trim() === '') {
    return { ok: false, id, error: 'title is required' };
  }
  if (!isGoalCategory(item.category)) {
    return {
      ok: false,
      id,
      error:
        'category must be one of career, learning, portfolio, project, other',
    };
  }
  if (!isGoalStatus(item.status)) {
    return { ok: false, id, error: 'status must be active or archived' };
  }
  if (
    typeof item.priority !== 'number' ||
    !Number.isFinite(item.priority) ||
    item.priority < 1
  ) {
    return { ok: false, id, error: 'priority must be a number >= 1' };
  }

  const description = optionalNullableString(item, 'description');
  if (!description.ok) {
    return { ok: false, id, error: 'description must be a string' };
  }
  const targetDate = optionalNullableString(item, 'target_date');
  if (!targetDate.ok) {
    return {
      ok: false,
      id,
      error: 'target_date must be a string in YYYY-MM-DD format',
    };
  }

  const goal: SetGoalInput = {
    title: item.title,
    description: description.value,
    category: item.category,
    status: item.status,
    priority: item.priority,
    target_date: targetDate.value,
  };
  if (id !== null) {
    goal.id = id;
  }

  return { ok: true, goal };
}

// 任意フィールド: 未指定/null は null、文字列はそのまま、それ以外の型は不正。
function optionalNullableString(
  item: Record<string, unknown>,
  key: string,
): { ok: true; value: string | null } | { ok: false } {
  if (!(key in item) || item[key] === undefined || item[key] === null) {
    return { ok: true, value: null };
  }
  if (typeof item[key] === 'string') {
    return { ok: true, value: item[key] as string };
  }
  return { ok: false };
}

function isGoalCategory(value: unknown): value is GoalCategory {
  return typeof value === 'string' && goalCategories.includes(value);
}

function isGoalStatus(value: unknown): value is GoalStatus {
  return typeof value === 'string' && goalStatuses.includes(value);
}
