'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, destination } from '@/lib/api';
import { useAuth } from '@/components/rivera/auth-provider';
const schema=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(12)});
export default function Settings(){const {user,loading,logout}=useAuth();const [message,setMessage]=useState('');const form=useForm<z.infer<typeof schema>>({resolver:zodResolver(schema)});if(loading)return <main className="auth-shell">Checking your session…</main>;if(!user)return <main className="auth-shell"><Link href="/login">Log in to view settings</Link></main>;return <main className="auth-shell"><div className="auth-card"><Link href={destination(user)}>← Dashboard</Link><h1>Account settings</h1><p>{user.firstName} {user.lastName}<br/>{user.email}</p><h2>Change password</h2><form onSubmit={form.handleSubmit(async data=>{try{await api('/auth/change-password',{method:'POST',body:JSON.stringify(data)},false);setMessage('Password changed. Please log in again.');setTimeout(()=>void logout(),1500)}catch(e){setMessage(e instanceof Error?e.message:'Try again.')}})}>{(['currentPassword','newPassword'] as const).map(name=><label className="field" key={name}><span>{name==='currentPassword'?'Current password':'New password'}</span><input type="password" {...form.register(name)}/><small>{form.formState.errors[name]?.message}</small></label>)}<button className="button primary form-submit">Change password</button></form>{message&&<p role="status">{message}</p>}<button className="deactivate" onClick={async()=>{if(!window.confirm('Deactivate your Rivera account?'))return;await api('/auth/deactivate',{method:'POST'},false);await logout()}}>Deactivate account</button></div></main>}
