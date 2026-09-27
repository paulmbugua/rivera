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
