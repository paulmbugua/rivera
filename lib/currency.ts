// This dependency-free policy is also used by the API: no separate browser exchange rate.
export { USD_KES_RATE, accountCurrency, convertMinor } from '@/apps/api/src/applications/currency-policy';
export type SettlementQuote = { amountMinor: number; currencyCode: string; originalAmountMinor: number; originalCurrencyCode: string; usdKesRate: number };
