import { ApiClient } from '../../services/api/client.js';
import {
  discardRemoteKnowledgeCandidates,
  type BulkDiscardCandidateResult,
  type DiscardCandidateInput,
} from '../../services/api/knowledge-candidate.js';

export async function handleDiscardPendingCandidates(
  args: Record<string, unknown> | undefined,
  apiClient: ApiClient,
) {
  if (!args || !Array.isArray(args.candidates)) {
    return {
      content: [{ type: 'text', text: 'candidates must be an array' }],
      isError: true,
    };
  }

  const localFailed: BulkDiscardCandidateResult[] = [];
  const validCandidates: DiscardCandidateInput[] = [];
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

    // reason はキー存在時に文字列のみ許可。不正型を undefined へ縮退させると
    // 理由なしで破壊的 discard が通ってしまうため、当該要素を失敗させる。
    if (
      'reason' in candidate &&
      candidate.reason !== undefined &&
      typeof candidate.reason !== 'string'
    ) {
      localFailed.push({
        index,
        candidate_id: candidate.candidate_id,
        status: 'failed',
        error: 'reason must be a string',
      });
      continue;
    }

    validCandidates.push({
      candidate_id: candidate.candidate_id,
      reason:
        typeof candidate.reason === 'string' ? candidate.reason : undefined,
    });
    originalIndexes.push(index);
  }

  let apiResults: BulkDiscardCandidateResult[];
  if (validCandidates.length === 0) {
    apiResults = [];
  } else {
    try {
      const response = await discardRemoteKnowledgeCandidates(
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
  const discardedCount = results.filter(
    (result) => result.status === 'discarded',
  ).length;
  const failedCount = results.filter(
    (result) => result.status === 'failed',
  ).length;

  const response = {
    success: failedCount === 0,
    discarded_count: discardedCount,
    failed_count: failedCount,
    results,
  };

  return {
    structuredContent: response,
    content: [{ type: 'text', text: JSON.stringify(response, null, 2) }],
    isError: failedCount > 0,
  };
}
