import { CreatorApplicationDetail } from '@/components/rivera/applications';
export default async function Page({params}:{params:Promise<{id:string}>}){return <CreatorApplicationDetail id={(await params).id}/>}
