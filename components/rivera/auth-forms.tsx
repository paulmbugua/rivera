'use client';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, destination, User } from '@/lib/api';
import { useAuth } from './auth-provider';
import { registerSchema, strongPassword } from '@/lib/auth-validation';
import { ArrowLeft, BadgeCheck, Eye, EyeOff, HeartHandshake, LockKeyhole, MailCheck, Sparkles } from 'lucide-react';
const login = z.object({ email: z.string().email(), password: z.string().min(1) });
const email = z.object({ email: z.string().email() });
const reset = z.object({ password: strongPassword, confirmPassword: z.string() }).refine(x => x.password === x.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' });
type Mode = 'register'|'login'|'forgot'|'reset'|'verify';
const schemas = { register: registerSchema, login, forgot: email, reset, verify: z.object({ token: z.string().min(1) }) };
const titles = { register: 'Create your account', login: 'Welcome back', forgot: 'Reset your password', reset: 'Choose a new password', verify: 'Verify your email' };
const moments = {
  register: { icon: HeartHandshake, kicker: 'A GOOD PLACE TO BEGIN', title: 'Your next partnership could start here.', copy: 'Create a profile that feels like you. We’ll keep the process clear, considered and human.' },
  login: { icon: Sparkles, kicker: 'WELCOME BACK', title: 'There is good work waiting to move forward.', copy: 'Return to your campaigns, conversations and opportunities without losing the thread.' },
  forgot: { icon: LockKeyhole, kicker: 'IT HAPPENS', title: 'A small pause—not a dead end.', copy: 'Enter your email and we’ll help you get safely back to the work that matters.' },
  reset: { icon: BadgeCheck, kicker: 'A FRESH START', title: 'Choose something secure and memorable.', copy: 'Your new password protects your profile, your conversations and the partnerships you build.' },
  verify: { icon: MailCheck, kicker: 'ONE LAST STEP', title: 'Let’s make sure it’s really you.', copy: 'Verification keeps the Rivera community safer and helps every introduction begin with trust.' },
};
export function AuthForm({ mode }: { mode: Mode }) {
  const search = useSearchParams()!; const { refresh } = useAuth();
  const [message, setMessage] = useState(''); const [error, setError] = useState(search.get('googleError') ? 'Google sign-in could not be completed. Please try again.' : '');
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>({});
  const form = useForm<Record<string,unknown>>({ resolver: zodResolver(schemas[mode] as never) as never, defaultValues: { token: search.get('token') ?? '', firstName: '', lastName: '', email: '', password: '', confirmPassword: '', accountType: '', termsAccepted: false } });
  const field = (name: string, label: string, type = 'text') => {
    const isPassword = type === 'password';
    const isVisible = Boolean(visiblePasswords[name]);
    const input = <input id={`${mode}-${name}`} type={isPassword && isVisible ? 'text' : type} autoComplete={name === 'password' ? (mode === 'login' ? 'current-password' : 'new-password') : name === 'confirmPassword' ? 'new-password' : name} aria-describedby={isPassword && name === 'password' && mode !== 'login' ? `${mode}-${name}-guidance` : undefined} {...form.register(name)} required/>;
    return <div className="field" key={name}><label htmlFor={`${mode}-${name}`}>{label}</label>{isPassword ? <span className="password-field">{input}<button type="button" className="password-toggle" aria-label={`${isVisible ? 'Hide' : 'Show'} ${label.toLowerCase()}`} aria-pressed={isVisible} onClick={() => setVisiblePasswords(current => ({ ...current, [name]: !current[name] }))}>{isVisible ? <EyeOff aria-hidden="true"/> : <Eye aria-hidden="true"/>}</button></span> : input}{isPassword && name === 'password' && mode !== 'login' && <span className="field-guidance" id={`${mode}-${name}-guidance`}>Use 8 or more characters with uppercase, lowercase and a number.</span>}<small role="alert">{form.formState.errors[name]?.message as string}</small></div>;
  };
  async function submit(data: Record<string,unknown>) {
    setError('');setMessage('');
    try {
      if (mode === 'register') { await api('/auth/register', { method:'POST', body: JSON.stringify({ firstName:data.firstName,lastName:data.lastName,email:data.email,password:data.password,accountType:data.accountType,termsAccepted:data.termsAccepted }) }, false); setMessage('Account created. Check your email for a verification link.'); }
      if (mode === 'login') { const response = await api<{user:User}>('/auth/login', { method:'POST', body: JSON.stringify(data) }, false); const user = await refresh(); window.location.replace(destination(user ?? response.user)); }
      if (mode === 'forgot') { const result = await api<{message:string}>('/auth/forgot-password', { method:'POST', body:JSON.stringify(data) }, false); setMessage(result.message); }
      if (mode === 'reset') { const result = await api<{message:string}>('/auth/reset-password', { method:'POST', body:JSON.stringify({ token:search.get('token'), password:data.password }) }, false); setMessage(result.message); }
      if (mode === 'verify') { const result = await api<{message:string}>('/auth/verify-email', { method:'POST', body:JSON.stringify({token:data.token}) }, false); setMessage(result.message); }
    } catch (e) { setError(e instanceof Error ? e.message : 'Please try again.'); }
  }
  const moment = moments[mode]; const MomentIcon = moment.icon;
  return <main className="auth-shell"><div className="auth-frame"><section className="auth-story"><Link href="/" className="brand"><span className="brand-mark">R.</span>rivera</Link><div className="auth-story-copy"><span className="auth-story-icon"><MomentIcon size={25}/></span><p className="eyebrow">{moment.kicker}</p><h2>{moment.title}</h2><p>{moment.copy}</p></div><p className="auth-story-foot">Where thoughtful brands and distinctive creators make meaningful work.</p></section><section className="auth-form-side"><Link href="/" className="auth-back"><ArrowLeft size={16}/> Back to Rivera</Link><div className="auth-card"><p className="eyebrow">RIVERA ACCOUNT</p><h1>{titles[mode]}</h1><p className="auth-intro">{mode === 'register' ? 'A few details, then you can shape a profile that makes the right first impression.' : mode === 'login' ? 'Pick up where you left off.' : 'We’ll keep this simple and secure.'}</p><form onSubmit={form.handleSubmit(submit)} noValidate>
    {mode === 'register' && <>{field('firstName','First name')}{field('lastName','Last name')}</>}
    {(['register','login','forgot'] as Mode[]).includes(mode) && field('email','Email address','email')}
    {(['register','login','reset'] as Mode[]).includes(mode) && field('password','Password','password')}
    {(['register','reset'] as Mode[]).includes(mode) && field('confirmPassword','Confirm password','password')}
    {mode === 'register' && <fieldset className="roles"><legend>I am joining as</legend><label><input type="radio" value="BUSINESS" {...form.register('accountType')}/> A business</label><label><input type="radio" value="CREATOR" {...form.register('accountType')}/> A content creator</label><small role="alert">{form.formState.errors.accountType?.message as string}</small></fieldset>}
    {mode === 'register' && <label className="terms-check"><input type="checkbox" {...form.register('termsAccepted')}/><span>I agree to Rivera’s <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.</span><small role="alert">{form.formState.errors.termsAccepted?.message as string}</small></label>}
    {mode === 'verify' && field('token','Verification token')}
    {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-success" role="status">{message}</p>}
    <button className="button primary form-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? 'Please wait…' : ({ register:'Create account',login:'Log in',forgot:'Send reset link',reset:'Reset password',verify:'Verify email' }[mode])}</button>
    {(['register','login'] as Mode[]).includes(mode)&&<><div className="auth-divider"><span>or</span></div><a className="google-button" href="/auth/google/start"><svg aria-hidden="true" viewBox="0 0 24 24"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.4Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.6-2.4l-3.2-2.5c-.9.6-2 1-3.4 1a5.8 5.8 0 0 1-5.5-4H3.2v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 14.1a6 6 0 0 1 0-4.1V7.4H3.2a10 10 0 0 0 0 9.3l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.5 0 2.8.5 3.8 1.5l2.9-2.8A9.7 9.7 0 0 0 3.2 7.4L6.5 10A5.8 5.8 0 0 1 12 6Z"/></svg>Continue with Google</a></>}
  </form><div className="auth-links">{mode !== 'login' && <Link href="/login">Log in</Link>}{mode !== 'register' && <Link href="/register">Create account</Link>}{mode === 'login' && <Link href="/forgot-password">Forgot password?</Link>}{mode === 'verify' && <Link href="/resend-verification">Send a new verification link</Link>}{mode === 'login' && <Link href="/resend-verification">Resend verification</Link>}</div></div></section></div></main>;
}
