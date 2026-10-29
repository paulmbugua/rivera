import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const migrated = [
  "components/rivera/admin-phase3.tsx",
  "components/rivera/application-admin.tsx",
  "components/rivera/applications.tsx",
  "components/rivera/collaborations.tsx",
  "components/rivera/financial.tsx",
  "components/rivera/operations.tsx",
  "components/rivera/profile-editor.tsx",
  "components/rivera/wise-payouts.tsx",
  "app/settings/page.tsx",
];

test("Rivera uses one accessible branded modal instead of native browser dialogs", async () => {
  const dialog = await source("components/rivera/rivera-dialog.tsx");
  const layout = await source("app/layout.tsx");
  const css = await source("app/rivera-dialog.css");
  assert.match(layout, /RiveraDialogProvider/);
  assert.match(dialog, /aria-modal="true"/);
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /event\.key === "Escape"/);
  assert.match(dialog, /event\.key === "Tab"/);
  assert.match(dialog, /opener\.current\?\.focus/);
  assert.match(dialog, /request\.minLength/);
  assert.match(css, /@media\(max-width:600px\)/);
  for (const path of migrated) {
    const value = await source(path);
    assert.doesNotMatch(value, /(?<![\w.])(?:window\.)?(?:alert|confirm|prompt)\s*\(/, path);
  }
});

test("revision requests use a validated multiline Rivera prompt", async () => {
  const collaborations = await source("components/rivera/collaborations.tsx");
  assert.match(collaborations, /title:"Request a revision"/);
  assert.match(collaborations, /minLength:10/);
  assert.match(collaborations, /maxLength:500/);
  assert.match(collaborations, /multiline:true/);
});
