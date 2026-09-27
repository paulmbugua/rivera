import { BusinessCampaignDetail } from '@/components/rivera/campaign-business';
export default async function Page({params}:{params:Promise<{id:string}>}){return <BusinessCampaignDetail id={(await params).id}/>}
