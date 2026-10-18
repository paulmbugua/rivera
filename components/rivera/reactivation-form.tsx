'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ArrowLeft, RotateCcwKey } from 'lucide-react';
import { api } from '@/lib/api';

const neutralMessage = 'If a deactivated account exists for this email, reactivation instructions have been sent.';

export function ReactivationForm() {
  const search = useSearchParams()!;
  const token = search.get('token')?.trim() ?? '';
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setError(''); setMessage('');
    try {
      if (token) {
        const result = await api<{ message: string }>('/auth/reactivation/confirm', { method: 'POST', body: JSON.stringify({ token }) }, false);
        setConfirmed(true); setMessage(result.message);
      } else {
        await api('/auth/reactivation/request', { method: 'POST', body: JSON.stringify({ email }) }, false);
        setMessage(neutralMessage); setEmail('');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Please try again.');
    } finally { setBusy(false); }
  }

  return <main className="auth-shell"><div className="auth-frame"><section className="auth-story"><Link href="/" className="brand"><span className="brand-mark">R.</span>rivera</Link><div className="auth-story-copy"><span className="auth-story-icon"><RotateCcwKey size={25}/></span><p className="eyebrow">WELCOME BACK</p><h2>Your place in Rivera is still here.</h2><p>Restore your profile securely, while keeping every previous session signed out.</p></div><p className="auth-story-foot">A considered return to campaigns, conversations and creative work.</p></section><section className="auth-form-side"><Link href="/login" className="auth-back"><ArrowLeft size={16}/> Back to login</Link><div className="auth-card"><p className="eyebrow">RIVERA ACCOUNT</p><h1>{token ? 'Reactivate your account' : 'Return to Rivera'}</h1><p className="auth-intro">{token ? 'Confirm that you want to restore this account. You will log in again when it is complete.' : 'Enter your verified email. For privacy, Rivera always shows the same response.'}</p>
    {!confirmed && <form onSubmit={submit} noValidate>{!token && <div className="field"><label htmlFor="reactivation-email">Email address</label><input id="reactivation-email" type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required/></div>}{error && <div className="form-error" role="alert"><p>{error}</p>{token && <Link className="support-link" href="/reactivate">Request a new link</Link>}</div>}{message && <p className="form-success" role="status">{message}</p>}<button className="button primary form-submit" disabled={busy}>{busy ? 'Please wait…' : token ? 'Reactivate account' : 'Send reactivation link'}</button></form>}
    {confirmed && <><p className="form-success" role="status">{message}</p><Link className="button primary form-submit reactivation-login" href="/login">Log in again</Link></>}
    <div className="auth-links"><Link href="/login">Log in</Link><a href="mailto:support@riveracreators.com">Contact support</a></div></div></section></div></main>;
}
