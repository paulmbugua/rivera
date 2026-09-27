import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(new URL(`../${path}`, import.meta.url),'utf8');
test('password validation requires case, number and length',()=>{const source=read('lib/auth-validation.ts');assert.match(source,/min\(12/);assert.match(source,/regex\(\/\[a-z\]\//);assert.match(source,/regex\(\/\[A-Z\]\//);assert.match(source,/regex\(\/\\d\//)});
test('registration requires account type, matching password and terms',()=>{const source=read('lib/auth-validation.ts');assert.match(source,/termsAccepted/);assert.match(source,/Passwords do not match/);assert.match(source,/BUSINESS.*CREATOR/)});
test('country selector provides a global ISO dataset',()=>{const source=read('lib/countries.ts');const codes=source.match(/const codes = '([^']+)'/)?.[1].split(' ')??[];assert.ok(codes.length>240);for(const code of ['KE','QA','US','GB'])assert.ok(codes.includes(code))});
test('auth forms contain labelled controls and error regions',()=>{const source=read('components/rivera/auth-forms.tsx');assert.match(source,/role="alert"/);assert.match(source,/termsAccepted/);assert.match(source,/disabled={form\.formState\.isSubmitting}/)});
test('protected pages use server-side role layouts',()=>{for(const path of ['dashboard/business','dashboard/creator','onboarding/business','onboarding/creator','admin','settings'])assert.match(read(`app/${path}/layout.tsx`),/requirePageRole/)});
test('auth and dashboard layouts retain phone-width breakpoints',()=>{const css=read('app/globals.css');assert.match(css,/@media\(max-width:520px\)/);assert.match(css,/@media\(max-width:420px\)/)});
test('campaign builder exposes five focused steps and draft saving',()=>{const source=read('components/rivera/campaign-business.tsx');for(const text of ['Campaign basics','Creator requirements','Deliverables','Budget & dates','Review & publish','Save draft'])assert.match(source,new RegExp(text))});
test('public campaign page renders summary fields without locked brief fields',()=>{const source=read('app/campaigns/[slug]/page.tsx');for(const text of ['Creator requirements','Deliverable summary','Opportunity summary','SaveCampaign'])assert.match(source,new RegExp(text));for(const locked of ['fullDescription','targetAudience','expectedOutcomes','specialInstructions'])assert.doesNotMatch(source,new RegExp(`c\\.${locked}`))});
test('Creator opportunity navigation includes browse recommendations and saved routes',()=>{const source=read('components/rivera/campaign-creator.tsx');for(const route of ['/dashboard/creator/opportunities','/dashboard/creator/opportunities/recommended','/dashboard/creator/saved-campaigns'])assert.match(source,new RegExp(route))});
test('campaign marketplace has mobile single-column layouts',()=>{const css=read('app/phase4.css');assert.match(css,/@media\(max-width:800px\)/);assert.match(css,/\.campaign-grid[^}]*grid-template-columns:1fr/)});
