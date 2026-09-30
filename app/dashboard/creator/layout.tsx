import { requirePageRole } from '@/lib/server-auth';
export default async function Layout({children}:{children:React.ReactNode}){await requirePageRole('CREATOR',{onboarding:'complete'});return children}
