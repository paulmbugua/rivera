import { CreatorCollaborations } from '@/components/rivera/collaborations';
export default async function Page({params}:{params:Promise<{id:string}>}){return <CreatorCollaborations id={(await params).id}/>}
