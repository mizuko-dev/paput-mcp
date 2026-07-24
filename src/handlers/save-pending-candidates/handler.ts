import { ApiClient } from '../../services/api/client.js';
import {
  listRemoteKnowledgeCandidates,
  saveRemoteKnowledgeCandidates,
  type SaveCandidateInput,
} from '../../services/api/knowledge-candidate.js';
import { createMemos } from '../../services/api/memo.js';
import type { CreateMemoParams } from '../../types/index.js';
import type { PendingKnowledgeCandidate } from '../../types/knowledge.js';

interface CandidateOverrides {
  title?: string;
  body?: string;
  categories?: string[];
  memo_type_keys?: string[];
  projects?: Array<{ id: number; title?: string }>;
  is_public?: boolean;
  created_at?: string;
}

interface WorkItem {
  index: number;
  candidateId: string;
  suppliedMemoId?: number;
  overrides: CandidateOverrides;
}

interface CreateItem {
  index: number;
  candidateId: string;
  memoParams: CreateMemoParams;
  saveParams: SaveCandidateInput;
}

interface SaveItem {
  index: number;
  candidateId: string;
  memoId: number;
  saveParams: SaveCandidateInput;
}

interface CandidateResult {
  index: number;
  candidate_id: string;
  saved_memo_id: number | null;
  status: 'saved' | 'failed';
  error?: string;
  retry_args?: { candidate_id: string; saved_memo_id: number };
}

const PENDING_LOOKUP_LIMIT = 200;

export async function handleSavePendingCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || !Array.isArray(args.candidates)) {
    return {
      content: [{ type: 'text', text: 'candidates must be an array' }],
      isError: true,
    };
  }

  const results: CandidateResult[] = [];
  const workItems: WorkItem[] = [];
  const seenCandidateIds = new Set<string>();

  for (const [index, raw] of args.candidates.entries()) {
    if (typeof raw !== 'object' || raw === null) {
      results.push({
        index,
        candidate_id: '',
        saved_memo_id: null,
        status: 'failed',
        error: 'Candidate item must be an object',
      });
      continue;
    }

    const candidate = raw as Record<string, unknown>;
    if (typeof candidate.candidate_id !== 'string') {
      results.push({
        index,
        candidate_id: '',
        saved_memo_id: null,
        status: 'failed',
        error: 'candidate_id is required',
      });
      continue;
    }

    // 同一 candidate_id が複数要素にあると、重複してメモが作られ2件目以降は
    // 冪等ガードで save 失敗＝孤立メモになる。副作用に入る前に弾く（retry_args は付けない）。
    if (seenCandidateIds.has(candidate.candidate_id)) {
      results.push({
        index,
        candidate_id: candidate.candidate_id,
        saved_memo_id: null,
        status: 'failed',
        error:
          'Duplicate candidate_id in this request; only the first occurrence is processed',
      });
      continue;
    }
    seenCandidateIds.add(candidate.candidate_id);

    workItems.push({
      index,
      candidateId: candidate.candidate_id,
      suppliedMemoId:
        typeof candidate.saved_memo_id === 'number'
          ? candidate.saved_memo_id
          : undefined,
      overrides: parseOverrides(candidate),
    });
  }

  // 段0: メモ作成が必要な候補（saved_memo_id 無し）がある場合のみ pending 一覧を1回取得する。
  const needsMemo = workItems.some((item) => item.suppliedMemoId === undefined);
  let pendingById: Map<string, PendingKnowledgeCandidate> | undefined;
  let listError: string | undefined;
  if (needsMemo) {
    try {
      const list = await listRemoteKnowledgeCandidates(apiClient, {
        status: 'pending',
        limit: PENDING_LOOKUP_LIMIT,
      });
      pendingById = new Map(list.candidates.map((c) => [c.id, c]));
    } catch (error) {
      listError = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  const toCreate: CreateItem[] = [];
  const toSave: SaveItem[] = [];

  for (const item of workItems) {
    if (item.suppliedMemoId !== undefined) {
      // 既存メモを添付する（retry を含む）: メモ作成を飛ばして段2の save へ。
      toSave.push({
        index: item.index,
        candidateId: item.candidateId,
        memoId: item.suppliedMemoId,
        saveParams: buildSuppliedSaveParams(
          item.candidateId,
          item.suppliedMemoId,
          item.overrides,
        ),
      });
      continue;
    }

    if (!pendingById) {
      results.push({
        index: item.index,
        candidate_id: item.candidateId,
        saved_memo_id: null,
        status: 'failed',
        error: `Failed to list pending candidates: ${listError}`,
      });
      continue;
    }

    const candidate = pendingById.get(item.candidateId);
    if (!candidate) {
      results.push({
        index: item.index,
        candidate_id: item.candidateId,
        saved_memo_id: null,
        status: 'failed',
        error: `Candidate not found among pending candidates (the pending lookup is capped at ${PENDING_LOOKUP_LIMIT}; if you have more than ${PENDING_LOOKUP_LIMIT} pending candidates it may not appear here)`,
      });
      continue;
    }

    const { memoParams, saveParams } = buildFromCandidate(
      item.candidateId,
      candidate,
      item.overrides,
    );
    toCreate.push({
      index: item.index,
      candidateId: item.candidateId,
      memoParams,
      saveParams,
    });
  }

  // 段1: 新規メモが要る候補を1回でまとめて作成し、成功分だけ段2へ進める。
  // createMemos は内部で例外を捕捉し常に failed[] を返すため throw しない。
  if (toCreate.length > 0) {
    const createResult = await createMemos(apiClient, {
      memos: toCreate.map((item) => item.memoParams),
    });

    for (const created of createResult.created) {
      const item = toCreate[created.index];
      if (!item) continue;
      if (created.id === undefined) {
        results.push({
          index: item.index,
          candidate_id: item.candidateId,
          saved_memo_id: null,
          status: 'failed',
          error: 'Memo creation returned no id',
        });
        continue;
      }
      toSave.push({
        index: item.index,
        candidateId: item.candidateId,
        memoId: created.id,
        saveParams: { ...item.saveParams, saved_memo_id: created.id },
      });
    }

    for (const failure of createResult.failed) {
      const item = toCreate[failure.index];
      if (!item) continue;
      results.push({
        index: item.index,
        candidate_id: item.candidateId,
        saved_memo_id: null,
        status: 'failed',
        error: `Failed to create memo: ${failure.error}`,
      });
    }
  }

  // 段2: メモ id を持つ候補を1回でまとめて save する。失敗要素には retry_args を載せる。
  if (toSave.length > 0) {
    try {
      const saveResult = await saveRemoteKnowledgeCandidates(
        apiClient,
        toSave.map((item) => item.saveParams),
      );
      for (const result of saveResult.results) {
        const item = toSave[result.index];
        if (!item) continue;
        if (result.status === 'saved') {
          results.push({
            index: item.index,
            candidate_id: item.candidateId,
            saved_memo_id: result.saved_memo_id ?? item.memoId,
            status: 'saved',
          });
        } else {
          results.push({
            index: item.index,
            candidate_id: item.candidateId,
            saved_memo_id: item.memoId,
            status: 'failed',
            error: result.error ?? 'Failed to save candidate',
            retry_args: {
              candidate_id: item.candidateId,
              saved_memo_id: item.memoId,
            },
          });
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      for (const item of toSave) {
        results.push({
          index: item.index,
          candidate_id: item.candidateId,
          saved_memo_id: item.memoId,
          status: 'failed',
          error: message,
          retry_args: {
            candidate_id: item.candidateId,
            saved_memo_id: item.memoId,
          },
        });
      }
    }
  }

  results.sort((a, b) => a.index - b.index);
  const savedCount = results.filter(
    (result) => result.status === 'saved',
  ).length;
  const failedCount = results.filter(
    (result) => result.status === 'failed',
  ).length;

  const response = {
    success: failedCount === 0,
    saved_count: savedCount,
    failed_count: failedCount,
    results,
  };

  return {
    structuredContent: response,
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    isError: failedCount > 0,
  };
}

function parseOverrides(candidate: Record<string, unknown>): CandidateOverrides {
  return {
    title: typeof candidate.title === 'string' ? candidate.title : undefined,
    body: typeof candidate.body === 'string' ? candidate.body : undefined,
    categories: Array.isArray(candidate.categories)
      ? candidate.categories.filter(
          (item): item is string => typeof item === 'string',
        )
      : undefined,
    memo_type_keys: Array.isArray(candidate.memo_type_keys)
      ? candidate.memo_type_keys.filter(
          (item): item is string => typeof item === 'string',
        )
      : undefined,
    projects: Array.isArray(candidate.projects)
      ? candidate.projects.filter(
          (project): project is { id: number; title?: string } =>
            typeof project === 'object' &&
            project !== null &&
            'id' in project &&
            typeof (project as { id: unknown }).id === 'number',
        )
      : undefined,
    is_public:
      typeof candidate.is_public === 'boolean' ? candidate.is_public : undefined,
    created_at:
      typeof candidate.created_at === 'string' ? candidate.created_at : undefined,
  };
}

function buildSuppliedSaveParams(
  candidateId: string,
  memoId: number,
  overrides: CandidateOverrides,
): SaveCandidateInput {
  const params: SaveCandidateInput = {
    candidate_id: candidateId,
    saved_memo_id: memoId,
  };
  if (overrides.title !== undefined) params.title = overrides.title;
  if (overrides.body !== undefined) params.body = overrides.body;
  if (overrides.categories !== undefined) params.categories = overrides.categories;
  if (overrides.memo_type_keys !== undefined)
    params.memo_type_keys = overrides.memo_type_keys;
  if (overrides.projects !== undefined) params.projects = overrides.projects;
  if (overrides.is_public !== undefined) params.is_public = overrides.is_public;
  if (overrides.created_at !== undefined) params.created_at = overrides.created_at;
  return params;
}

function buildFromCandidate(
  candidateId: string,
  candidate: PendingKnowledgeCandidate,
  overrides: CandidateOverrides,
): { memoParams: CreateMemoParams; saveParams: SaveCandidateInput } {
  const title = overrides.title ?? candidate.title;
  const body = overrides.body ?? candidate.body;
  const categories = overrides.categories ?? candidate.categories ?? [];
  const memoTypeKeys = overrides.memo_type_keys ?? candidate.memo_type_keys ?? [];
  const projects = overrides.projects ?? candidate.projects ?? [];
  const isPublic = overrides.is_public ?? candidate.is_public ?? false;
  const sourceSessionUpdatedAt =
    typeof candidate.source_session_updated_at === 'string'
      ? candidate.source_session_updated_at
      : undefined;
  const createdAt =
    overrides.created_at ?? sourceSessionUpdatedAt ?? candidate.created_at;

  const memoParams: CreateMemoParams = {
    title,
    body,
    is_public: isPublic,
    created_at: createdAt,
    categories: categories.map((name) => ({ name })),
    memo_type_keys: memoTypeKeys,
    projects,
  };

  // saved_memo_id はメモ作成後に付与する。
  const saveParams: SaveCandidateInput = {
    candidate_id: candidateId,
    title,
    body,
    categories,
    memo_type_keys: memoTypeKeys,
    projects,
    is_public: isPublic,
    created_at: createdAt,
  };

  return { memoParams, saveParams };
}
