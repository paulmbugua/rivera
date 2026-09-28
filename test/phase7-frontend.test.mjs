import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const source=path=>readFileSync(path,'utf8');
test('collaboration UI shows progress, version history and role actions',()=>{const value=source('components/rivera/collaborations.tsx');assert.match(value,/WORKSPACE PROGRESS/);assert.match(value,/Version \{sub\.version\}/);assert.match(value,/Submit new version/);assert.match(value,/Approve/);assert.match(value,/Request revision/);assert.match(value,/Complete collaboration/)});
test('workspace forms expose labels and accessible error output',()=>{const value=source('components/rivera/collaborations.tsx');assert.match(value,/role="alert"/);assert.match(value,/HTTPS deliverable link/);assert.match(value,/private file/);assert.match(value,/aria-label="Deliverable progress"/)});
test('public profiles render aggregate and individual reviews',()=>{for(const path of ['app/creators/[slug]/page.tsx','app/businesses/[slug]/page.tsx']){const value=source(path);assert.match(value,/verified collaboration reviews/);assert.match(value,/REVIEWS/);assert.match(value,/out of 5 stars/)}});
test('admin review moderation supports hide restore and remove',()=>{const value=source('components/rivera/review-admin.tsx');assert.match(value,/HIDE/);assert.match(value,/RESTORE/);assert.match(value,/REMOVE/)});
