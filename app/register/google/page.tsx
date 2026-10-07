import { Suspense } from 'react';
import { GoogleRegistrationForm } from '@/components/rivera/google-registration-form';

export default function GoogleRegistrationPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card" role="status" aria-live="polite">
            <p className="eyebrow">RIVERA ACCOUNT</p>
            <h1>Preparing your account…</h1>
            <p>We’re securely completing your Google sign-up.</p>
          </div>
        </main>
      }
    >
      <GoogleRegistrationForm />
    </Suspense>
  );
}
