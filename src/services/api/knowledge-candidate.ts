import { ApiClient } from './client.js';
import type {
  CandidateSource,
  CapturePolicy,
  KnowledgeCandidateInput,
  PendingKnowledgeCandidate,
  ProcessedSession,
  SessionSource,
} from '../../types/knowledge.js';

export interface AddKnowledgeCandidatesRemoteParams {
  source: CandidateSource;
  session_id?: string;
  source_session_updated_at?: string;
  candidates: Array<
    KnowledgeCandidateInput & {
      similar_memos?: Array<{ id: number; title: string; score: number }>;
    }
  >;
}

export interface AddKnowledgeCandidatesRemoteResponse {
  added: number;
  duplicates: number;
  candidates: PendingKnowledgeCandidate[];
  duplicate_details: Array<{
    title: string;
    reason: string;
    candidate_id?: string;
    similar_memos?: Array<{ id: number; title: string; score: number }>;
  }>;
}

export interface ListKnowledgeCandidatesRemoteResponse {
  count: number;
  candidates: PendingKnowledgeCandidate[];
}

export interface DiscardPolicyContextRemoteResponse {
  policy: CapturePolicy;
  total_discarded_count: number;
  returned_discarded_count: number;
  discarded_candidates: PendingKnowledgeCandidate[];
}

export interface ProcessedSessionsRemoteResponse {
  sessions: ProcessedSession[];
}

export async function addRemoteKnowledgeCandidates(
  client: ApiClient,
  params: AddKnowledgeCandidatesRemoteParams,
): Promise<AddKnowledgeCandidatesRemoteResponse> {
  return client.post<AddKnowledgeCandidatesRemoteResponse>(
    '/api/v1/mcp/knowledge-candidates',
    params,
  );
}

export async function listRemoteKnowledgeCandidates(
  client: ApiClient,
  params: { status?: string; limit?: number } = {},
): Promise<ListKnowledgeCandidatesRemoteResponse> {
  const queryParams = new URLSearchParams();
  if (params.status) queryParams.append('status', params.status);
  if (params.limit) queryParams.append('limit', String(params.limit));
  const suffix = queryParams.toString() ? `?${queryParams.toString()}` : '';
  return client.get<ListKnowledgeCandidatesRemoteResponse>(
    `/api/v1/mcp/knowledge-candidates${suffix}`,
  );
}

export async function getRemoteCapturePolicy(
  client: ApiClient,
): Promise<CapturePolicy> {
  return client.get<CapturePolicy>('/api/v1/mcp/capture-policy');
}

export async function updateRemoteCapturePolicy(
  client: ApiClient,
  markdown: string,
): Promise<CapturePolicy> {
  return client.put<CapturePolicy>('/api/v1/mcp/capture-policy', {
    markdown,
  });
}

export async function getRemoteDiscardPolicyContext(
  client: ApiClient,
  limit?: number,
): Promise<DiscardPolicyContextRemoteResponse> {
  const suffix = limit ? `?limit=${encodeURIComponent(String(limit))}` : '';
  return client.get<DiscardPolicyContextRemoteResponse>(
    `/api/v1/mcp/discard-policy-context${suffix}`,
  );
}

export async function listRemoteProcessedSessions(
  client: ApiClient,
  source?: SessionSource,
): Promise<ProcessedSessionsRemoteResponse> {
  const suffix = source ? `?source=${encodeURIComponent(source)}` : '';
  return client.get<ProcessedSessionsRemoteResponse>(
    `/api/v1/mcp/processed-sessions${suffix}`,
  );
}

export interface MarkProcessedSessionInput {
  source: SessionSource;
  session_id: string;
  source_session_updated_at?: string;
}

export interface BulkMarkProcessedSessionResult {
  index: number;
  session_id: string;
  status: 'marked' | 'failed';
  error: string | null;
}

export interface BulkMarkProcessedSessionsResponse {
  success: boolean;
  marked_count: number;
  failed_count: number;
  results: BulkMarkProcessedSessionResult[];
}

export async function markRemoteProcessedSessions(
  client: ApiClient,
  sessions: MarkProcessedSessionInput[],
): Promise<BulkMarkProcessedSessionsResponse> {
  return client.post<BulkMarkProcessedSessionsResponse>(
    '/api/v1/mcp/processed-sessions',
    { sessions },
  );
}

export interface SaveCandidateInput {
  candidate_id: string;
  saved_memo_id?: number;
  title?: string;
  body?: string;
  categories?: string[];
  memo_type_keys?: string[];
  projects?: Array<{ id: number; title?: string }>;
  is_public?: boolean;
  created_at?: string;
}

export interface BulkSaveCandidateResult {
  index: number;
  candidate_id: string;
  saved_memo_id: number | null;
  status: 'saved' | 'failed';
  error: string | null;
}

export interface BulkSaveCandidatesResponse {
  success: boolean;
  saved_count: number;
  failed_count: number;
  results: BulkSaveCandidateResult[];
}

export async function saveRemoteKnowledgeCandidates(
  client: ApiClient,
  candidates: SaveCandidateInput[],
): Promise<BulkSaveCandidatesResponse> {
  return client.put<BulkSaveCandidatesResponse>(
    '/api/v1/mcp/knowledge-candidates/save',
    { candidates },
  );
}

export interface UpdateCandidateInput {
  candidate_id: string;
  title?: string;
  body?: string;
  categories?: string[];
  memo_type_keys?: string[];
  projects?: Array<{ id: number; title?: string }>;
  confidence?: number;
  is_public?: boolean;
}

export interface BulkUpdateCandidateResult {
  index: number;
  candidate_id: string;
  status: 'updated' | 'failed';
  error: string | null;
}

export interface BulkUpdateCandidatesResponse {
  success: boolean;
  updated_count: number;
  failed_count: number;
  results: BulkUpdateCandidateResult[];
}

export async function updateRemoteKnowledgeCandidates(
  client: ApiClient,
  candidates: UpdateCandidateInput[],
): Promise<BulkUpdateCandidatesResponse> {
  return client.put<BulkUpdateCandidatesResponse>(
    '/api/v1/mcp/knowledge-candidates',
    { candidates },
  );
}

export interface DiscardCandidateInput {
  candidate_id: string;
  reason?: string;
}

export interface BulkDiscardCandidateResult {
  index: number;
  candidate_id: string;
  status: 'discarded' | 'failed';
  error: string | null;
}

export interface BulkDiscardCandidatesResponse {
  success: boolean;
  discarded_count: number;
  failed_count: number;
  results: BulkDiscardCandidateResult[];
}

export async function discardRemoteKnowledgeCandidates(
  client: ApiClient,
  candidates: DiscardCandidateInput[],
): Promise<BulkDiscardCandidatesResponse> {
  return client.put<BulkDiscardCandidatesResponse>(
    '/api/v1/mcp/knowledge-candidates/discard',
    { candidates },
  );
}
