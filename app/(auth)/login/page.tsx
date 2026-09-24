import { Suspense } from 'react';
import { AuthForm } from '@/components/rivera/auth-forms';
export default function Page() { return <Suspense fallback={<main className="auth-shell">Loading…</main>}><AuthForm mode="login"/></Suspense> }
