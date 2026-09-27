'use client';
import { useState } from 'react';
export function ShareProfile({title}:{title:string}){const [copied,setCopied]=useState(false);async function share(){const url=window.location.href;if(navigator.share){await navigator.share({title,url});return}await navigator.clipboard.writeText(url);setCopied(true);setTimeout(()=>setCopied(false),1800)}return <button className="button secondary" onClick={()=>void share()}>{copied?'Link copied':'Share profile'}</button>}
