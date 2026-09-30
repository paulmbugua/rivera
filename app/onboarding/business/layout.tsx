import { requirePageRole } from '@/lib/server-auth';
export default async function Layout({children}:{children:React.ReactNode}){await requirePageRole('BUSINESS',{onboarding:'incomplete'});return children}
