import { ProposalForm } from '@/components/rivera/applications';
export default async function Page({params}:{params:Promise<{campaignId:string}>}){return <ProposalForm campaignId={(await params).campaignId}/>}
