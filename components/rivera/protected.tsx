'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from './auth-provider';
import { destination, User } from '@/lib/api';
export function Protected({ role, onboarding, children }: { role: User['roles'][number]; onboarding?: boolean; children: React.ReactNode }) {
  const { user, loading } = useAuth(); const router = useRouter();
  useEffect(() => { if (loading) return; if (!user) router.replace('/login'); else if (!user.roles.includes(role)) router.replace(destination(user)); else if (onboarding === true && !user.onboardingCompleted) router.replace(destination(user)); else if (onboarding === false && user.onboardingCompleted) router.replace(destination(user)); }, [loading, user, role, onboarding, router]);
  if (loading) return <div className="auth-shell"><p>Checking your session…</p></div>;
  if (!user || !user.roles.includes(role) || (onboarding === true && !user.onboardingCompleted) || (onboarding === false && user.onboardingCompleted)) return null;
  return <>{children}</>;
}
