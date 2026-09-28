import { ConversationDetail } from '@/components/rivera/collaborations';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ConversationDetail role="creator" id={(await params).id}/>}
