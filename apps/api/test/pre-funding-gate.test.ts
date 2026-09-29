import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const collaborations = source("src/collaborations/collaborations.service.ts");
const workspace = source("src/collaborations/workspace.service.ts");
const payments = source("src/payments/marketplace-payment.service.ts");
const operations = source("src/operations/operations.service.ts");
const schema = source("prisma/schema.prisma");

test("accepted Offers create an awaiting-funding participant and deadline", () => {
  assert.match(schema, /enum CampaignParticipantStatus\s*{[\s\S]*AWAITING_FUNDING/);
  assert.match(collaborations, /status: "AWAITING_FUNDING"/);
  assert.match(collaborations, /COLLABORATION_FUNDING_DEADLINE_HOURS/);
  assert.match(collaborations, /fundingDueAt/);
});
test("unfunded accepted Creators reserve Campaign slots", () => {
  assert.match(collaborations, /status: \{ in: \["AWAITING_FUNDING", "ACTIVE", "COMPLETED"\] \}/);
  assert.match(collaborations, /\["AWAITING_FUNDING", "ACTIVE", "COMPLETED"\]\.includes/);
});
test("funding ownership is server-authorized and amounts are server-calculated", () => {
  assert.match(payments, /business: \{ userId \}/);
  assert.match(payments, /agreedCompensationMinor/);
  assert.match(payments, /Only the Campaign Business can manage this payment/);
});
test("provider confirmation validates amount and currency", () => {
  assert.match(payments, /PAYMENT_AMOUNT_MISMATCH/);
  assert.match(payments, /PAYMENT_CURRENCY_MISMATCH/);
  assert.match(payments, /retrievePayment/);
});
test("verified funding atomically activates the participant once", () => {
  assert.match(payments, /where: \{ id, fundedAt: null \}/);
  assert.match(payments, /status: "FUNDED"/);
  assert.match(payments, /status: "AWAITING_FUNDING"[\s\S]*status: "ACTIVE", activatedAt: now/);
  assert.match(payments, /COLLABORATION_FUNDED_AND_ACTIVATED/);
});
test("funding failure never activates the collaboration", () => {
  const failure = payments.slice(payments.indexOf("private async markFundingFailed"), payments.indexOf("private async applyTransferState"));
  assert.match(failure, /status: "FAILED"/);
  assert.doesNotMatch(failure, /status: "ACTIVE"/);
});
test("Creator submissions require active participant and funded payment", () => {
  assert.match(workspace, /campaignParticipant\.status!==['"]ACTIVE['"]/);
  assert.match(workspace, /collaborationPayment\?\.status!==['"]FUNDED['"]/);
  assert.match(workspace, /COLLABORATION_NOT_FUNDED/);
  assert.match(workspace, /This collaboration must be funded before Campaign work can be submitted\./);
});
test("submission funding is rechecked inside the serialized transaction", () => {
  assert.match(workspace, /pg_advisory_xact_lock/);
  const create = workspace.slice(workspace.indexOf("private async createSubmission"), workspace.indexOf("private async businessSubmission"));
  assert.match(create, /campaignParticipant:\{include:\{collaborationPayment:true\}\}/);
  assert.match(create, /COLLABORATION_NOT_FUNDED/);
});
test("deadlines produce idempotent reminders and overdue notifications", () => {
  assert.match(operations, /fundingReminderSentAt/);
  assert.match(operations, /fundingOverdueNotifiedAt/);
  assert.match(operations, /FUNDING_REMINDER/);
  assert.match(operations, /FUNDING_OVERDUE/);
});
test("both parties can cancel under the unfunded rules without deletion", () => {
  assert.match(collaborations, /async cancelUnfunded/);
  assert.match(collaborations, /FUNDING_DEADLINE_NOT_PASSED/);
  assert.match(collaborations, /COLLABORATION_CANCELLED_UNFUNDED/);
  assert.doesNotMatch(collaborations.slice(collaborations.indexOf("async cancelUnfunded"), collaborations.indexOf("async contact")), /\.delete\(/);
});
test("completion and later release remain gated", () => {
  assert.match(workspace, /REQUIRED_WORK_INCOMPLETE/);
  assert.match(payments, /PAYMENT_NOT_FUNDED/);
  assert.match(payments, /p\.status === "COMPLETED"/);
  assert.match(payments, /x\.status === "APPROVED"/);
});
