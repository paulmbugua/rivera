import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=path=>readFileSync(new URL(`../${path}`,import.meta.url),'utf8');
test('product scale is loaded last and covers auth, finance, settings and mobile breakpoints',()=>{
  const root=source('app/layout.tsx'),css=source('app/product-scale.css');
  assert.ok(root.indexOf('./product-scale.css')>root.indexOf('./globals.css'));
  for(const item of ['--product-content: 1024px','--product-auth: 420px','.auth-shell .auth-frame','.application-shell','.settings-shell','max-width: 900px','max-width: 600px','max-width: 360px','font-size: 16px','focus-visible','prefers-reduced-motion'])assert.ok(css.includes(item),item);
  assert.doesNotMatch(css,/\bzoom\s*:|transform:\s*scale|user-scalable/);
});
test('Flutter uses shared responsive rails without capping accessibility text scaling',()=>{
  const rails=source('apps/mobile/lib/widgets/responsive.dart');
  for(const item of ['authWidth = 480','formWidth = 720','contentWidth = 960','LayoutBuilder','ScrollViewKeyboardDismissBehavior.onDrag'])assert.ok(rails.includes(item));
  for(const name of ['auth','account','onboarding','dashboard','workspace','marketplace','notifications'])assert.ok(source(`apps/mobile/lib/screens/${name}_screen.dart`).includes('RiveraPage'));
  assert.doesNotMatch(rails,/TextScaler\.noScaling|textScaleFactor:\s*1/);
});
