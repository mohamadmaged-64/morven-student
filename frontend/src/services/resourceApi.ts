import { authRequest, authedFetch } from './authApi';
import { API_BASE } from './apiBase';
import type { ResourceType } from '@/data/resources';

// ---------------------------------------------------------------------------
// Types (mirror of the backend Resource API response shapes)
// ---------------------------------------------------------------------------

export interface ApiResourceFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: number;
}

export interface ApiResourceNote {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface ApiResourceLink {
  id: string;
  title: string;
  url: string;
  createdAt: number;
}

export interface ApiResource {
  id: string;
  title: string;
  description: string | null;
  type: ResourceType;
  ownerId: string;
  uploadedBy: string;
  uploadedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiResourceDetail extends ApiResource {
  files: ApiResourceFile[];
  notes: ApiResourceNote[];
  links: ApiResourceLink[];
}

interface ApiError {
  error?: string;
}

async function unwrapResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `حدث خطأ (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      if (data?.error) message = data.error;
    } catch {
      // ignore — non-JSON body
    }
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

// ---------------------------------------------------------------------------
// Resource endpoints
// ---------------------------------------------------------------------------

export async function getResources(): Promise<ApiResource[]> {
  const { resources } = await authRequest<{ resources: ApiResource[] }>('/api/resources');
  return resources;
}

export async function getResource(resourceId: string): Promise<ApiResourceDetail> {
  const { resource } = await authRequest<{ resource: ApiResourceDetail }>(
    `/api/resources/${encodeURIComponent(resourceId)}`,
  );
  return resource;
}

export async function createResourceApi(input: {
  title: string;
  description?: string;
  type: ResourceType;
}): Promise<ApiResource> {
  const { resource } = await authRequest<{ resource: ApiResource }>('/api/resources', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return resource;
}

export async function updateResourceApi(
  resourceId: string,
  input: { title?: string; description?: string | null; type?: ResourceType },
): Promise<ApiResource> {
  const { resource } = await authRequest<{ resource: ApiResource }>(
    `/api/resources/${encodeURIComponent(resourceId)}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    },
  );
  return resource;
}

export async function deleteResourceApi(resourceId: string): Promise<void> {
  await authRequest<{ message: string }>(`/api/resources/${encodeURIComponent(resourceId)}`, {
    method: 'DELETE',
  });
}

// ---------------------------------------------------------------------------
// File endpoints
// ---------------------------------------------------------------------------

export async function uploadResourceFiles(
  resourceId: string,
  files: File[],
): Promise<ApiResourceFile[]> {
  const fd = new FormData();
  for (const file of files) {
    fd.append('files', file);
  }

  const res = await authedFetch(
    `${API_BASE}/api/resources/${encodeURIComponent(resourceId)}/files`,
    { method: 'POST', body: fd },
  );
  const { files: uploaded } = await unwrapResponse<{ files: ApiResourceFile[] }>(res);
  return uploaded;
}

export async function deleteResourceFileApi(resourceId: string, fileId: string): Promise<void> {
  await authRequest<{ message: string }>(
    `/api/resources/${encodeURIComponent(resourceId)}/files/${encodeURIComponent(fileId)}`,
    { method: 'DELETE' },
  );
}

export async function downloadResourceFile(resourceId: string, fileId: string, filename: string): Promise<void> {
  const res = await authedFetch(
    `${API_BASE}/api/resources/${encodeURIComponent(resourceId)}/files/${encodeURIComponent(fileId)}/download`,
    { method: 'GET' },
  );
  if (!res.ok) {
    let message = `حدث خطأ (${res.status})`;
    try {
      const data = (await res.json()) as ApiError;
      if (data?.error) message = data.error;
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// Note endpoints
// ---------------------------------------------------------------------------

export async function addResourceNoteApi(
  resourceId: string,
  title: string,
  content: string,
): Promise<ApiResourceNote> {
  const { note } = await authRequest<{ note: ApiResourceNote }>(
    `/api/resources/${encodeURIComponent(resourceId)}/notes`,
    { method: 'POST', body: JSON.stringify({ title, content }) },
  );
  return note;
}

export async function deleteResourceNoteApi(resourceId: string, noteId: string): Promise<void> {
  await authRequest<{ message: string }>(
    `/api/resources/${encodeURIComponent(resourceId)}/notes/${encodeURIComponent(noteId)}`,
    { method: 'DELETE' },
  );
}

// ---------------------------------------------------------------------------
// Link endpoints
// ---------------------------------------------------------------------------

export async function addResourceLinkApi(
  resourceId: string,
  title: string,
  url: string,
): Promise<ApiResourceLink> {
  const { link } = await authRequest<{ link: ApiResourceLink }>(
    `/api/resources/${encodeURIComponent(resourceId)}/links`,
    { method: 'POST', body: JSON.stringify({ title, url }) },
  );
  return link;
}

export async function deleteResourceLinkApi(resourceId: string, linkId: string): Promise<void> {
  await authRequest<{ message: string }>(
    `/api/resources/${encodeURIComponent(resourceId)}/links/${encodeURIComponent(linkId)}`,
    { method: 'DELETE' },
  );
}
