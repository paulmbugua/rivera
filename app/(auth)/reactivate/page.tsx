import { Suspense } from 'react';
import { ReactivationForm } from '@/components/rivera/reactivation-form';

export default function Page() {
  return <Suspense fallback={<main className="auth-shell">Loading…</main>}><ReactivationForm/></Suspense>;
}
