import { CreatorOffers } from '@/components/rivera/collaborations';
export default async function Page({params}:{params:Promise<{id:string}>}){return <CreatorOffers id={(await params).id}/>}
