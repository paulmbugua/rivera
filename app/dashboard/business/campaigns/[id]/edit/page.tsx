import { CampaignWizard } from '@/components/rivera/campaign-business';
export default async function Page({params}:{params:Promise<{id:string}>}){return <CampaignWizard campaignId={(await params).id}/>}
