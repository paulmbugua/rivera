import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/packages/shared/src';
import type { User } from '@/lib/api';

const serverApiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:4000/api/v1';

function roleDestination(user: User) {
  if (user.roles.includes('ADMIN')) return '/admin';
  if (user.roles.includes('BUSINESS')) {
    return user.onboardingCompleted ? '/dashboard/business' : '/onboarding/business';
  }
  return user.onboardingCompleted ? '/dashboard/creator' : '/onboarding/creator';
}

export async function getServerUser(): Promise<User | null> {
  const cookieStore = await cookies();
  if (!cookieStore.get('rivera_access')) return null;
  const cookieHeader = cookieStore.getAll().map(({ name, value }) => `${name}=${value}`).join('; ');

  let response: Response;
  try {
    response = await fetch(`${serverApiUrl}/auth/me`, {
      headers: { accept: 'application/json', cookie: cookieHeader },
      cache: 'no-store',
    });
  } catch (error) {
    throw new Error('Rivera could not verify this session because the API is unavailable.', { cause: error });
  }

  if (response.status === 401 || response.status === 403) return null;
  if (!response.ok) throw new Error(`Rivera session verification failed with status ${response.status}.`);
  return response.json() as Promise<User>;
}

type PageRoleOptions = { onboarding?: 'complete' | 'incomplete' };

export async function requirePageRole(role?: UserRole, options: PageRoleOptions = {}) {
  const user = await getServerUser();
  if (!user) redirect('/login');
  if (role && !user.roles.includes(role)) redirect(roleDestination(user));

  if (role === 'BUSINESS' || role === 'CREATOR') {
    const onboardingRoute = role === 'BUSINESS' ? '/onboarding/business' : '/onboarding/creator';
    const dashboardRoute = role === 'BUSINESS' ? '/dashboard/business' : '/dashboard/creator';
    if (options.onboarding === 'complete' && !user.onboardingCompleted) redirect(onboardingRoute);
    if (options.onboarding === 'incomplete' && user.onboardingCompleted) redirect(dashboardRoute);
  }
  return user;
}
