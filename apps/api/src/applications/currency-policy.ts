// Contract rate, not a market quote. Keep historical USD/KES settlements at this rate.
export const USD_KES_RATE = 130;
export const accountCurrency = (country?: string | null) => country?.trim().toUpperCase() === 'KE' ? 'KES' : 'USD';
export function convertMinor(amount: number, from: string, to: string): number {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error('INVALID_MONEY_AMOUNT');
  from = from.toUpperCase(); to = to.toUpperCase();
  if (from === to) return amount;
  if (!['USD', 'KES'].includes(from) || !['USD', 'KES'].includes(to)) throw new Error('UNSUPPORTED_EXCHANGE_CURRENCY');
  const result = from === 'USD' ? amount * USD_KES_RATE : Math.round(amount / USD_KES_RATE);
  if (!Number.isSafeInteger(result)) throw new Error('MONEY_AMOUNT_TOO_LARGE');
  return result;
}
export function settlementQuote(amountMinor: number, currencyCode: string, provider: string) {
  const currency = currencyCode.toUpperCase();
  const settlementCurrency = provider === 'PAYSTACK' ? 'KES' : currency;
  return { amountMinor: convertMinor(amountMinor, currency, settlementCurrency), currencyCode: settlementCurrency,
    originalAmountMinor: amountMinor, originalCurrencyCode: currency,
    usdKesRate: USD_KES_RATE };
}
