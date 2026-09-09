import { authRequest } from './authApi';
import { toNetworkError } from './apiError';
import { isPreviewMode } from '@/dev/previewMode';
import type { DhikrCategory } from '@/data/adhkar';

export type DhikrSubmissionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface DhikrSubmission {
  id: string;
  userId: string;
  categoryId: DhikrCategory;
  title: string;
  text: string;
  source: string;
  status: DhikrSubmissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface OfficialApprovedDhikr {
  id: string;
  categoryId: DhikrCategory;
  title: string;
  text: string;
  source: string;
  createdAt: string;
}

export interface AdminDhikrSubmission extends DhikrSubmission {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string | null;
  };
}

export interface CreateDhikrSubmissionInput {
  categoryId: DhikrCategory;
  title: string;
  text: string;
  source?: string;
}

/**
 * Submits a dhikr proposal. The backend always stores it as PENDING — it never
 * becomes official/visible content until an administrator approves it.
 */
export async function submitDhikrSubmission(
  input: CreateDhikrSubmissionInput,
): Promise<DhikrSubmission> {
  const data = await authRequest<{ submission: DhikrSubmission }>(
    '/api/adhkar/submissions',
    {
      method: 'POST',
      body: JSON.stringify(input),
    },
  );
  return data.submission;
}

/**
 * Fetches the approved user-submitted dhikr list (public — works for guests).
 * PENDING/REJECTED rows are never returned by the server, so offline/reserved
 * content is unaffected. Returns an empty list in preview mode and on network
 * failure, so the bundled offline adhkar remain the source of truth.
 */
export async function fetchApprovedAdhkar(): Promise<OfficialApprovedDhikr[]> {
  if (isPreviewMode()) return [];
  try {
    const data = await authRequest<{ adhkar: OfficialApprovedDhikr[] }>(
      '/api/adhkar/submissions/official',
    );
    return data.adhkar;
  } catch (err) {
    if (err instanceof TypeError) {
      throw toNetworkError('تعذر الاتصال بالخادم', err);
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Admin only
// ---------------------------------------------------------------------------

export async function listDhikrSubmissions(): Promise<AdminDhikrSubmission[]> {
  const data = await authRequest<{ submissions: AdminDhikrSubmission[] }>(
    '/api/admin/adhkar/submissions',
  );
  return data.submissions;
}

export async function approveDhikrSubmission(
  id: string,
): Promise<DhikrSubmission> {
  const data = await authRequest<{ submission: DhikrSubmission }>(
    `/api/admin/adhkar/submissions/${encodeURIComponent(id)}/approve`,
    { method: 'POST' },
  );
  return data.submission;
}

export async function rejectDhikrSubmission(
  id: string,
): Promise<DhikrSubmission> {
  const data = await authRequest<{ submission: DhikrSubmission }>(
    `/api/admin/adhkar/submissions/${encodeURIComponent(id)}/reject`,
    { method: 'POST' },
  );
  return data.submission;
}