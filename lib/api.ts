export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';
export class ApiError extends Error { constructor(message: string, public status: number) { super(message); } }
export async function api<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  let response: Response;
  try { response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...options.headers }, credentials: 'include', cache: 'no-store' }); }
  catch { throw new ApiError('Cannot reach Rivera right now. Please try again.', 0); }
  if (response.status === 401 && retry && path !== '/auth/refresh' && path !== '/auth/login') {
    try { await api('/auth/refresh', { method: 'POST' }, false); return api<T>(path, options, false); } catch { /* keep original error */ }
  }
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const data = body as { message?: string | string[] } | null;
    throw new ApiError(Array.isArray(data?.message) ? data.message.join('. ') : data?.message ?? 'Something went wrong. Please try again.', response.status);
  }
  return body as T;
}
import type { UserRole } from '@/packages/shared/src';
export type User = { id: string; email: string; firstName: string; lastName: string; status: string; emailVerified: boolean; roles: UserRole[]; onboardingCompleted: boolean };
export const destination = (user: User) => user.roles.includes('ADMIN') ? '/dashboard/admin' : user.roles.includes('BUSINESS') ? (user.onboardingCompleted ? '/dashboard/business' : '/onboarding/business') : (user.onboardingCompleted ? '/dashboard/creator' : '/onboarding/creator');
