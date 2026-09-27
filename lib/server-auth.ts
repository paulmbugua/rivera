import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/packages/shared/src';

type Claims = { sub?: string; roles?: UserRole[]; exp?: number };
const decode = (value: string) => Uint8Array.from(Buffer.from(value.replace(/-/g,'+').replace(/_/g,'/'), 'base64'));

async function verifiedClaims(token: string): Promise<Claims | null> {
  const secret=process.env.JWT_ACCESS_SECRET;
  if(!secret)return null;
  const parts=token.split('.');
  if(parts.length!==3)return null;
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('HMAC',key,decode(parts[2]),new TextEncoder().encode(`${parts[0]}.${parts[1]}`)))return null;
  try{const claims=JSON.parse(new TextDecoder().decode(decode(parts[1]))) as Claims;return claims.exp&&claims.exp*1000>Date.now()?claims:null}catch{return null}
}

export async function requirePageRole(role?:UserRole){
  const token=(await cookies()).get('rivera_access')?.value;
  const claims=token?await verifiedClaims(token):null;
  if(!claims?.sub)redirect('/login');
  if(role&&!claims.roles?.includes(role)){
    if(claims.roles?.includes('ADMIN'))redirect('/admin');
    if(claims.roles?.includes('BUSINESS'))redirect('/dashboard/business');
    redirect('/dashboard/creator');
  }
  return claims;
}
