import { NextResponse } from 'next/server';
import type { ApiResponse } from './types';

export function json<T>(data: T, status = 200) {
  return NextResponse.json(data satisfies ApiResponse<T>, { status });
}

export function ok<T>(data: T, message?: string, status = 200) {
  return json({ success: true, message, data }, status);
}

export function fail(message: string, status = 400, errors?: Record<string, string>) {
  return NextResponse.json({ success: false, message, errors } satisfies ApiResponse<never>, { status });
}

export function unauthorized(message = 'Unauthorized') {
  return fail(message, 401);
}

export function forbidden(message = 'Forbidden') {
  return fail(message, 403);
}

export function notFound(message = 'Not found') {
  return fail(message, 404);
}

export async function handleErrors<T>(fn: () => Promise<NextResponse>): Promise<NextResponse> {
  try {
    return await fn();
  } catch (e: unknown) {
    const err = e as Error & { code?: string };
    if (err.code === 'P2002') {
      return fail('A record with this value already exists.', 409);
    }
    if (err.message === 'Unauthorized') return unauthorized();
    if (err.message === 'Forbidden') return forbidden();
    console.error('API error:', err);
    const msg = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    return fail(msg, 500);
  }
}

// Parse pagination query params
export function paginate(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page') ?? '1'));
  const pageSize = Math.min(50, Math.max(5, Number(searchParams.get('pageSize') ?? '15')));
  const skip = (page - 1) * pageSize;
  return { page, pageSize, skip, take: pageSize };
}

export function withMeta<T>(data: T[], total: number, page: number, pageSize: number) {
  return {
    success: true,
    data,
    meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}
