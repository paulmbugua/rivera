import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CampaignDto } from '../src/campaigns/dto';
import { campaignDraftFields, campaignSelectionsSaved } from '../../../lib/campaign-draft';
import type { Campaign } from '../../../lib/campaigns';

const defaults={title:'',campaignCountryCode:'',campaignCity:'',budgetMinMinor:undefined as number|undefined,categoryIds:[] as string[],platforms:[],languages:[],deliverables:[]};
const saved={
  id:'draft-1',title:'Beauty Products',status:'DRAFT',businessId:'business-1',
  campaignCountryCode:null,campaignCity:null,budgetMinMinor:null,
  categories:[{id:'relation-1',categoryId:'beauty',category:{id:'beauty',name:'Beauty',slug:'beauty'}}],
  creatorLocations:[],
  platforms:[{id:'platform-1',campaignId:'draft-1',platform:'TIKTOK',required:true,minimumFollowers:null,preferredFollowers:null}],
  languages:[{id:'language-1',campaignId:'draft-1',languageCode:'en',required:true}],
  deliverables:[{id:'deliverable-1',campaignId:'draft-1',title:'Product video',quantity:1,platform:'TIKTOK',contentTypeId:null,contentType:null,description:null,dueDate:null,sortOrder:0}],
} as unknown as Campaign;

test('reopened campaign retains selections and produces a valid strict draft request',async()=>{
  const draft=campaignDraftFields(defaults,saved);
  assert.deepEqual(draft.categoryIds,['beauty']);
  assert.equal(draft.deliverables.length,1);
  assert.equal(draft.campaignCountryCode,'');
  assert.equal(draft.budgetMinMinor,undefined);
  const body=JSON.parse(JSON.stringify({...draft,campaignCountryCode:undefined,applicationDeadline:undefined,campaignStartDate:undefined,campaignEndDate:undefined}));
  const errors=await validate(plainToInstance(CampaignDto,body),{whitelist:true,forbidNonWhitelisted:true});
  assert.deepEqual(errors,[]);
  assert.equal('id' in body,false);
  assert.equal('status' in body,false);
  assert.equal('id' in body.platforms[0],false);
  assert.equal('campaignId' in body.deliverables[0],false);
});

test('save verification catches dropped categories, missing deliverables and changed deliverable values',()=>{
  const submitted={categoryIds:['beauty'],deliverables:[{title:'Product video',quantity:1,platform:'TIKTOK'}]};
  assert.equal(campaignSelectionsSaved(submitted,saved),true);
  assert.equal(campaignSelectionsSaved(submitted,{...saved,categories:[]}),false);
  assert.equal(campaignSelectionsSaved(submitted,{...saved,deliverables:[]}),false);
  assert.equal(campaignSelectionsSaved(submitted,{...saved,deliverables:[{...saved.deliverables[0],quantity:2}]}),false);
});

test('category mapping supports owner relation and public category responses',()=>{
  const publicShape={...saved,categories:[{id:'beauty',name:'Beauty',slug:'beauty',isPrimary:true}]};
  assert.deepEqual(campaignDraftFields(defaults,publicShape).categoryIds,['beauty']);
  assert.equal(campaignSelectionsSaved({categoryIds:['beauty'],deliverables:saved.deliverables},publicShape),true);
});
