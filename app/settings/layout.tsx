import type { Metadata } from 'next';
import { requirePageRole } from '@/lib/server-auth';
export const metadata:Metadata={robots:{index:false,follow:false,nocache:true}};
export default async function Layout({children}:{children:React.ReactNode}){await requirePageRole();return children}
