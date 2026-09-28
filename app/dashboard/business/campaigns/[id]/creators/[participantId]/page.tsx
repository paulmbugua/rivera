import { BusinessCollaborations } from '@/components/rivera/collaborations';
export default async function Page({params}:{params:Promise<{id:string;participantId:string}>}){const value=await params;return <BusinessCollaborations campaignId={value.id} id={value.participantId}/>}
