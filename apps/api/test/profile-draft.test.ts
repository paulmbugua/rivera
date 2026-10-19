import 'reflect-metadata';
import test from 'node:test';
import assert from 'node:assert/strict';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BusinessProfileDto, CreatorProfileDto } from '../src/marketplace/dto';
import { businessProfilePayload, creatorProfilePayload } from '../../../lib/profile-draft';

test('business editor submits editable profile fields without server-owned metadata',async()=>{
  const profile={id:'business-1',userId:'user-1',businessName:' Rivera Studio ',slug:'rivera-studio',description:'A creative studio.',countryCode:'ke',city:'Nairobi',industryId:'industry-1',website:'',profileVisibility:'PRIVATE',profileCompletion:80,verificationStatus:'VERIFIED',logoUrl:'https://example.com/logo.png',categories:[]};
  const body=JSON.parse(JSON.stringify(businessProfilePayload(profile)));
  assert.equal(body.businessName,'Rivera Studio');
  assert.equal(body.countryCode,'KE');
  assert.equal('id' in body,false);
  assert.equal('verificationStatus' in body,false);
  assert.equal('logoUrl' in body,false);
  assert.deepEqual(await validate(plainToInstance(BusinessProfileDto,body),{whitelist:true,forbidNonWhitelisted:true}),[]);
});

test('creator editor retains category order and language choices without relation metadata',async()=>{
  const profile={displayName:' Amina ',slug:'amina',headline:'Lifestyle creator',bio:'Stories from Nairobi.',countryCode:'ke',city:'Nairobi',travelAvailable:true,remoteCampaignsAllowed:true,profileVisibility:'PRIVATE',categories:[{id:'relation-1',category:{id:'beauty'},isPrimary:false},{id:'relation-2',category:{id:'travel'},isPrimary:true}],contentTypes:[{contentType:{id:'video'}}],languages:[{id:'language-1',creatorId:'creator-1',languageCode:'sw',proficiency:'PROFESSIONAL'}],websiteUrl:'',professionalContactEmail:''};
  const body=JSON.parse(JSON.stringify(creatorProfilePayload(profile)));
  assert.deepEqual(body.categoryIds,['beauty','travel']);
  assert.equal(body.primaryCategoryId,'travel');
  assert.deepEqual(body.contentTypeIds,['video']);
  assert.deepEqual(body.languages,[{languageCode:'sw',proficiency:'PROFESSIONAL'}]);
  assert.equal('websiteUrl' in body,false);
  assert.deepEqual(await validate(plainToInstance(CreatorProfileDto,body),{whitelist:true,forbidNonWhitelisted:true}),[]);
});
