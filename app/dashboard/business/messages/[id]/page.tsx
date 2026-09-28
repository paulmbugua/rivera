import { ConversationDetail } from '@/components/rivera/collaborations';
export default async function Page({params}:{params:Promise<{id:string}>}){return <ConversationDetail role="business" id={(await params).id}/>}
