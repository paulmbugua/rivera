'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { useAuth } from './auth-provider';
import { Protected } from './protected';
const categories = ['Technology','Fashion','Food','Travel','Beauty','Automotive','Fitness','Gaming','Lifestyle','Other'];
const platforms = ['Instagram','TikTok','YouTube','Facebook','X','LinkedIn','Snapchat','Twitch','Blog','Podcast','Other'];
const businessSchema = z.object({ name:z.string().min(2), country:z.string().min(2),city:z.string().min(1),industry:z.string().min(2),description:z.string().min(10),website:z.union([z.literal(''),z.string().url()]) });
const creatorSchema = z.object({ displayName:z.string().min(2),country:z.string().min(2),city:z.string().min(1),primaryCategory:z.string().refine(x=>categories.includes(x)),primaryPlatform:z.string().refine(x=>platforms.includes(x)),bio:z.string().min(10) });
export function OnboardingForm({ role }: {role:'BUSINESS'|'CREATOR'}) { return <Protected role={role} onboarding={false}><Inner role={role}/></Protected> }
function Inner({role}:{role:'BUSINESS'|'CREATOR'}) {
  const [error,setError]=useState('');const router=useRouter();const { refresh,user }=useAuth();
  const form=useForm<Record<string,string>>({resolver:zodResolver((role==='BUSINESS'?businessSchema:creatorSchema) as never) as never,defaultValues:{name:'',displayName:user?.firstName?`${user.firstName} ${user.lastName}`:'',country:'',city:'',industry:'',description:'',website:'',primaryCategory:'',primaryPlatform:'',bio:''}});
  const field=(name:string,label:string,large=false)=><label className="field" key={name}><span>{label}</span>{large?<textarea {...form.register(name)} rows={4}/>:<input {...form.register(name)}/>}<small role="alert">{form.formState.errors[name]?.message as string}</small></label>;
  const select=(name:string,label:string,values:string[])=><label className="field" key={name}><span>{label}</span><select {...form.register(name)}><option value="">Choose one</option>{values.map(x=><option key={x}>{x}</option>)}</select><small role="alert">{form.formState.errors[name]?.message as string}</small></label>;
  async function submit(data:Record<string,string>){setError('');try{const result=await api<{next:string}>(`/onboarding/${role.toLowerCase()}`,{method:'POST',body:JSON.stringify(role==='BUSINESS' && !data.website ? {...data,website:undefined}:data)},false);await refresh();router.replace(result.next)}catch(e){setError(e instanceof Error?e.message:'Try again.')}}
  return <main className="auth-shell"><div className="auth-card onboarding-card"><p className="eyebrow">GETTING STARTED</p><h1>{role==='BUSINESS'?'Tell us about your business':'Tell us about yourself'}</h1><p>Just the essentials for now. You can add more later.</p><form onSubmit={form.handleSubmit(submit)} noValidate>{role==='BUSINESS'?<>{field('name','Business name')}{field('country','Country')}{field('city','City')}{field('industry','Industry')}{field('description','Short description',true)}{field('website','Website (optional)')}</>:<>{field('displayName','Display name')}{field('country','Country')}{field('city','City')}{select('primaryCategory','Primary creator category',categories)}{select('primaryPlatform','Primary platform',platforms)}{field('bio','Short bio',true)}</>}{error&&<p className="form-error" role="alert">{error}</p>}<button className="button primary form-submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting?'Saving…':'Continue to dashboard'}</button></form></div></main>;
}
