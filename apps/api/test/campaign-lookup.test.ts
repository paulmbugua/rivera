import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { CampaignsService } from '../src/campaigns/campaigns.service';

function fixture(status='OPEN',visibility='PUBLIC',deletedAt:Date|null=null){return {id:'campaign-id-1',slug:'beauty-products',title:'Beauty Products',status,visibility,deletedAt,fullDescription:'Private full brief',targetAudience:'Private audience',specialInstructions:'Private instructions',budgetVisibility:'PUBLIC',budgetMinMinor:10000,business:{name:'Beauty Studio'},categories:[],creatorLocations:[],platforms:[],languages:[],deliverables:[],attachments:[],campaignObjective:'BRAND_AWARENESS',currencyCode:'USD'};}
function service(row=fixture()){
  const db={campaign:{findFirst:async({where}:any)=>{
    assert.equal(where.status,'OPEN');assert.deepEqual(where.visibility,{in:['PUBLIC','UNLISTED']});assert.equal(where.deletedAt,null);
    return where.OR.some((lookup:any)=>lookup.id===row.id||lookup.slug===row.slug)&&row.status===where.status&&where.visibility.in.includes(row.visibility)&&!row.deletedAt?row:null;
  },update:async()=>row}};
  return new CampaignsService(db as never);
}
test('proposal campaign lookup works by ID and existing public slug',async()=>{
  const lookup=service();
  for(const identifier of ['campaign-id-1','beauty-products']){
    const campaign=await lookup.publicDetail(identifier);
    assert.equal(campaign.id,'campaign-id-1');assert.equal(campaign.slug,'beauty-products');
    for(const field of ['fullDescription','targetAudience','specialInstructions'])assert.equal(field in campaign,false);
  }
});
test('ID lookup keeps draft, private, deleted and closed campaigns protected',async()=>{
  for(const row of [fixture('DRAFT'),fixture('OPEN','PRIVATE'),fixture('OPEN','PUBLIC',new Date()),fixture('CLOSED')]){
    await assert.rejects(()=>service(row).publicDetail(row.id),(error:any)=>error.getStatus()===404);
  }
  await assert.rejects(()=>service().publicDetail('missing-id'),(error:any)=>error.getStatus()===404);
});
test('unlisted open campaign can still be opened by its direct ID',async()=>{
  assert.equal((await service(fixture('OPEN','UNLISTED')).publicDetail('campaign-id-1')).id,'campaign-id-1');
});
