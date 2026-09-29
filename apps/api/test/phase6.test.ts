import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const source=(path:string)=>readFileSync(join(process.cwd(),path),'utf8');
const service=()=>source('src/collaborations/collaborations.service.ts');

test('Application status changes are centralized and accepted is terminal',()=>{const value=source('src/collaborations/application-status.service.ts');assert.match(value,/OFFERED: \['SHORTLISTED', 'ACCEPTED'/);assert.match(value,/ACCEPTED: \[\]/);assert.match(value,/INVALID_APPLICATION_TRANSITION/)});
test('only Campaign owners can shortlist reject and send Offers',()=>{const value=service();assert.match(value,/campaign:\s*\{\s*business:\s*\{\s*userId\s*\}\s*\}/);assert.match(value,/CAMPAIGN_OWNERSHIP_REQUIRED/);assert.match(source('src/collaborations/collaborations.controllers.ts'),/applications\/:id\/shortlist/)});
test('shortlisting upserts exactly one Application conversation',()=>{const schema=source('prisma/schema.prisma');assert.match(schema,/applicationId\s+String\s+@unique/);assert.match(service(),/conversation\.upsert\(\{\s*where:\s*\{\s*applicationId:\s*id\s*\}/)});
test('messaging requires participant membership and shortlisted-or-later state',()=>{const value=service();assert.match(value,/participants:\s*\{\s*some:\s*\{\s*userId\s*\}\s*\}/);assert.match(value,/activeConversationStates/);assert.match(value,/CONVERSATION_ACCESS_DENIED/)});
test('Offers are versioned and only one SENT Offer is active',()=>{const migration=source('prisma/migrations/20260928_phase6_collaboration_hiring/migration.sql');assert.match(migration,/applicationId_version/);assert.match(migration,/one_active_sent_offer_per_application/);assert.match(service(),/status:\s*"WITHDRAWN"/)});
test('Creator Offer decisions are ownership protected',()=>{const value=service();assert.match(value,/where:\s*\{\s*id,\s*creator:\s*\{\s*userId\s*\}\s*\}/);assert.match(value,/Only the Offer Creator can accept it/)});
test('acceptance is serializable and capacity locked per Campaign',()=>{const value=service();assert.match(value,/pg_advisory_xact_lock/);assert.match(value,/TransactionIsolationLevel\.Serializable/);assert.match(value,/hired\s*>=\s*offer\.campaign\.creatorSlots/);assert.match(value,/campaignParticipant\.create/)});
test('professional contacts require a funded-active or completed paired participant',()=>{const value=service();assert.match(value,/status:\s*\{\s*in:\s*\["ACTIVE",\s*"COMPLETED"\]\s*\}[\s\S]*?OR:\s*\[[\s\S]*?creator:\s*\{\s*userId\s*\}[\s\S]*?business:\s*\{\s*userId\s*\}/);assert.match(value,/COLLABORATION_CONTACT_LOCKED/);const publicProfiles=source('src/marketplace/marketplace.service.ts');const publicCreator=publicProfiles.slice(publicProfiles.indexOf('private publicCreator'),publicProfiles.indexOf('async creatorPublic'));assert.doesNotMatch(publicCreator,/professionalContactEmail|professionalPhone/)});
test('Phase 5 payment code remains intact',()=>{const phase5=source('src/applications/applications.service.ts');assert.match(phase5,/APPLICATION_FEE_PAID/);assert.match(phase5,/verifyWebhook/);assert.match(phase5,/freeApplicationCredits:\s*\{\s*decrement:\s*1\s*\}/)});
