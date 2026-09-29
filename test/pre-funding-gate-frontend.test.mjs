import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const collaborations = readFileSync("components/rivera/collaborations.tsx", "utf8");
const finance = readFileSync("components/rivera/financial.tsx", "utf8");

test("Creator sees a clear waiting-for-funding state", () => {
  assert.match(collaborations, /You’re hired — waiting for Business funding\./);
  assert.match(collaborations, /Formal work is locked until Rivera verifies payment/);
  assert.match(collaborations, /fundingDueAt/);
});
test("submission controls only render when server workspace says work is unlocked", () => {
  assert.match(collaborations, /role==="creator"&&workspace\.canSubmitWork/);
});
test("Business sees compensation fee total and funding CTA", () => {
  for (const text of ["Creator compensation", "Rivera fee", "Total Business payment", "Fund Collaboration"])
    assert.match(collaborations, new RegExp(text));
});
test("funded is distinguished from Creator receipt and release", () => {
  assert.match(collaborations, /Funded compensation is not the same as money received/);
  assert.match(finance, /This is not yet money received/);
  assert.match(finance, /Release Creator payment/);
});
test("failed payment and unfunded cancellation have clear recovery actions", () => {
  assert.match(finance, /last funding attempt failed/);
  assert.match(collaborations, /Cancel unfunded collaboration/);
  assert.match(collaborations, /Cancel overdue unfunded collaboration/);
});
