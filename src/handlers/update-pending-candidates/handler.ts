import { ApiClient } from '../../services/api/client.js';
import {
  updateRemoteKnowledgeCandidates,
  type BulkUpdateCandidateResult,
  type UpdateCandidateInput,
} from '../../services/api/knowledge-candidate.js';

type PatchResult =
  | { fields: Omit<UpdateCandidateInput, 'candidate_id'> }
  | { error: string };

export async function handleUpdatePendingCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || !Array.isArray(args.candidates)) {
    return {
      content: [{ type: 'text', text: 'candidates must be an array' }],
      isError: true,
    };
  }

  const localFailed: BulkUpdateCandidateResult[] = [];
  const validCandidates: UpdateCandidateInput[] = [];
  const originalIndexes: number[] = [];

  for (const [index, raw] of args.candidates.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      localFailed.push({
        index,
        candidate_id: '',
        status: 'failed',
        error: 'Candidate item must be an object',
      });
      continue;
    }

    const candidate = raw as Record<string, unknown>;
    if (
      typeof candidate.candidate_id !== 'string' ||
      candidate.candidate_id.trim() === ''
    ) {
      localFailed.push({
        index,
        candidate_id: '',
        status: 'failed',
        error: 'candidate_id is required',
      });
      continue;
    }

    const patch = buildPatch(candidate);
    if ('error' in patch) {
      localFailed.push({
        index,
        candidate_id: candidate.candidate_id,
        status: 'failed',
        error: patch.error,
      });
      continue;
    }
    if (Object.keys(patch.fields).length === 0) {
      localFailed.push({
        index,
        candidate_id: candidate.candidate_id,
        status: 'failed',
        error:
          'No updatable fields were provided. Provide at least one of title, body, categories, memo_type_keys, confidence, is_public, or projects.',
      });
      continue;
    }

    validCandidates.push({
      candidate_id: candidate.candidate_id,
      ...patch.fields,
    });
    originalIndexes.push(index);
  }

  let apiResults: BulkUpdateCandidateResult[];
  if (validCandidates.length === 0) {
    apiResults = [];
  } else {
    try {
      const response = await updateRemoteKnowledgeCandidates(
        apiClient,
        validCandidates,
      );
      apiResults = response.results.map((result) => ({
        ...result,
        index: originalIndexes[result.index] ?? result.index,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      apiResults = validCandidates.map((candidate, index) => ({
        index: originalIndexes[index] ?? index,
        candidate_id: candidate.candidate_id,
        status: 'failed',
        error: message,
      }));
    }
  }

  const results = [...localFailed, ...apiResults].sort(
    (a, b) => a.index - b.index,
  );
  const updatedCount = results.filter(
    (result) => result.status === 'updated',
  ).length;
  const failedCount = results.filter(
    (result) => result.status === 'failed',
  ).length;

  const response = {
    success: failedCount === 0,
    updated_count: updatedCount,
    failed_count: failedCount,
    results,
  };

  return {
    structuredContent: response,
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    isError: failedCount > 0,
  };
}

function buildPatch(candidate: Record<string, unknown>): PatchResult {
  const fields: Omit<UpdateCandidateInput, 'candidate_id'> = {};

  if ('title' in candidate) {
    if (typeof candidate.title !== 'string' || candidate.title.trim() === '') {
      return { error: 'title must be a non-empty string' };
    }
    fields.title = candidate.title;
  }

  if ('body' in candidate) {
    if (typeof candidate.body !== 'string' || candidate.body.trim() === '') {
      return { error: 'body must be a non-empty string' };
    }
    fields.body = candidate.body;
  }

  // 置換配列は全置換セマンティクスなので、不正要素を黙って除去するとデータ損失
  // （categories:[123]→[] で全消去、projects の不正要素で意図せぬリンク解除）になる。
  // 1要素でも広告スキーマに反したら candidate ごと失敗させる。
  if ('categories' in candidate) {
    if (
      !Array.isArray(candidate.categories) ||
      !candidate.categories.every((category) => typeof category === 'string')
    ) {
      return { error: 'categories must be an array of strings' };
    }
    fields.categories = candidate.categories as string[];
  }

  if ('memo_type_keys' in candidate) {
    const allowed = ['knowledge', 'decision', 'operation', 'principle'];
    if (
      !Array.isArray(candidate.memo_type_keys) ||
      !candidate.memo_type_keys.every(
        (key) => typeof key === 'string' && allowed.includes(key),
      )
    ) {
      return {
        error:
          'memo_type_keys must be an array of knowledge, decision, operation, or principle',
      };
    }
    fields.memo_type_keys = candidate.memo_type_keys as string[];
  }

  if ('projects' in candidate) {
    if (
      !Array.isArray(candidate.projects) ||
      !candidate.projects.every((project) => isProjectReference(project))
    ) {
      return {
        error:
          'projects must be an array of { id: positive integer, title?: string }',
      };
    }
    fields.projects = candidate.projects as Array<{
      id: number;
      title?: string;
    }>;
  }

  if ('confidence' in candidate) {
    if (
      typeof candidate.confidence !== 'number' ||
      !Number.isFinite(candidate.confidence) ||
      candidate.confidence < 0 ||
      candidate.confidence > 1
    ) {
      return { error: 'confidence must be a number between 0 and 1' };
    }
    fields.confidence = candidate.confidence;
  }

  if ('is_public' in candidate) {
    if (typeof candidate.is_public !== 'boolean') {
      return { error: 'is_public must be a boolean' };
    }
    fields.is_public = candidate.is_public;
  }

  return { fields };
}

function isProjectReference(
  value: unknown,
): value is { id: number; title?: string } {
  if (typeof value !== 'object' || value === null) return false;
  const project = value as Record<string, unknown>;
  if (
    typeof project.id !== 'number' ||
    !Number.isInteger(project.id) ||
    project.id <= 0
  ) {
    return false;
  }
  if ('title' in project && typeof project.title !== 'string') {
    return false;
  }
  return true;
}
