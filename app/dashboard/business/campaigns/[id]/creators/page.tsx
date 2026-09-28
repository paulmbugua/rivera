import { BusinessCollaborations } from '@/components/rivera/collaborations';
export default async function Page({params}:{params:Promise<{id:string}>}){return <BusinessCollaborations campaignId={(await params).id}/>}
