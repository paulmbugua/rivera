# Rivera currency and settlement

- Application/platform fees are priced in USD. The default application fee is USD 3 (300 cents), unless an active fee rule overrides it. Legacy KES fee rules are converted to USD cents at the fixed rate, rounded to the nearest cent.
- Signed-in Kenyan accounts see KES; accounts in other countries see USD. The account country falls back to the country selected during business/creator onboarding. Contract currencies are not rewritten when a user changes country.
- New campaigns default to the account currency; only USD and KES are offered. Proposal/offer entry uses the viewer's currency, then converts to the campaign contract currency before submitting. Existing contracts remain unchanged.
- USD 1 = KES 130 is an explicit contractual rate, not a live FX feed. USD cents multiply by 130 to become KES cents. KES-to-USD display rounds to the nearest cent. Exact KES checkout/payout amounts are disclosed separately.
- Paystack receives KES for application fees, collaboration funding, eligible creator transfers and refunds. Refund callers pass the original contract currency so refunds are converted exactly once. Original contract amounts remain authoritative in the ledger.
- The marketplace percentage fee is calculated on the agreed compensation and rounded up to one USD cent before conversion to a KES contract. `MARKETPLACE_SERVICE_FEE_FIXED_MINOR` and the corresponding admin setting are USD cents. The percentage setting and existing funded fee snapshots are unchanged.
- Signed webhooks are verified and successful charges are independently checked with Paystack. Stored references, expected converted amounts, currency, paid status and environment must match. Browser redirects are never proof of payment. Existing unique references, serializable transactions and atomic state guards protect against duplicates.
- Checkout metadata and successful-payment audit entries include both contract and settlement values plus the fixed rate. Do not change the historical rate constant in place: any future rate revision must introduce persisted per-payment rate/version snapshots and preserve this version for existing records.
- Kenyan M-Pesa is the current payout rail. USD display does **not** enable international payouts. Non-Kenyan recipients see the restriction and a support link; no unsupported country is silently routed to a Kenyan recipient.

## Verification

`currency-settlement.test.ts` covers the fixed rate, country preference, fees, funding, transfers, refunds, amount/currency/reference mismatches, duplicate funding and legacy KES payments. Payment-provider requests are mocked; tests create no real transactions.

Before rollout, check production fee configuration (never print secret keys), active fee-rule currencies, and the country/currency of existing funded payments. Keep `PAYSTACK_CURRENCY=KES`. Roll back by redeploying the prior API/web images, but do not process new USD-denominated Paystack transactions with the prior release: its reconciliation does not understand converted settlement.
