import { BusinessApplications } from '@/components/rivera/applications';
export default async function Page({params}:{params:Promise<{id:string}>}){return <BusinessApplications campaignId={(await params).id}/>}
