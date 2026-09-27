import { CampaignAdminDetail } from '@/components/rivera/campaign-admin';
export default async function Page({params}:{params:Promise<{id:string}>}){return <CampaignAdminDetail id={(await params).id}/>}
