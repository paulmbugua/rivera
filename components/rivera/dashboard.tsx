'use client';
import Link from 'next/link';
import { Protected } from './protected';
import { useAuth } from './auth-provider';
export function Dashboard({role}:{role:'BUSINESS'|'CREATOR'|'ADMIN'}) {return <Protected role={role} onboarding={role==='ADMIN'?undefined:true}><Inner role={role}/></Protected>}
function Inner({role}:{role:'BUSINESS'|'CREATOR'|'ADMIN'}) {const {user,logout}=useAuth();return <main className="dashboard-shell"><header><Link href="/" className="brand"><span className="brand-mark">R.</span>rivera</Link><nav><Link href="/settings">Settings</Link><button onClick={()=>void logout()}>Log out</button></nav></header><section><p className="eyebrow">{role} DASHBOARD</p><h1>Welcome, {user?.firstName}.</h1><p>{role==='BUSINESS'?'Your business profile is ready. Campaign posting is coming in a later phase.':role==='CREATOR'?'Your creator profile is ready. Opportunities are coming in a later phase.':'Administrator tools are coming in a later phase.'}</p><div className="dashboard-empty"><h2>{role==='BUSINESS'?'No campaigns yet':role==='CREATOR'?'No applications yet':'No admin tools yet'}</h2><p>We’ll add this workspace as Rivera develops.</p></div></section></main>}
