import { BusinessApplicationDetail } from '@/components/rivera/applications';
export default async function Page({params}:{params:Promise<{id:string;applicationId:string}>}){const p=await params;return <BusinessApplicationDetail campaignId={p.id} id={p.applicationId}/>}
