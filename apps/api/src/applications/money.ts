export const currencyDigits = (currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency }).resolvedOptions().maximumFractionDigits ?? 2;
export const majorToMinor = (amount: number, currency: string) => Math.round(amount * 10 ** currencyDigits(currency));
export const minorToMajor = (amountMinor: number, currency: string) => amountMinor / 10 ** currencyDigits(currency);
export const formatMoney = (amountMinor: number, currency: string) => new Intl.NumberFormat('en', { style: 'currency', currency }).format(minorToMajor(amountMinor, currency));
