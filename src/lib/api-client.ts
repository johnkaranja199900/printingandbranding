import type { ApiResponse } from '@/lib/types';

const BASE = '/api';

export class ApiError extends Error {
  status: number;
  errors?: Record<string, string>;
  constructor(message: string, status: number, errors?: Record<string, string>) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

export async function api<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers ?? {}),
    },
    credentials: 'same-origin',
  });
  let json: ApiResponse<T>;
  try {
    json = await res.json();
  } catch {
    throw new ApiError('Network error', res.status);
  }
  if (!json.success) {
    throw new ApiError(json.message ?? 'Request failed', res.status, json.errors);
  }
  return json.data as T;
}

export const apiClient = {
  get: <T = unknown>(path: string) => api<T>(path),
  post: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  patch: <T = unknown>(path: string, body?: unknown) =>
    api<T>(path, { method: 'PATCH', body: body ? JSON.stringify(body) : undefined }),
  delete: <T = unknown>(path: string) => api<T>(path, { method: 'DELETE' }),
};
