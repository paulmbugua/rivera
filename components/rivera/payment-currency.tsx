'use client';
import { money } from '@/lib/applications';
import { accountCurrency, convertMinor, SettlementQuote } from '@/lib/currency';
import { useOptionalAuth } from './auth-provider';
import type { Campaign } from '@/lib/campaigns';

export function useDisplayCurrency() {
  const auth = useOptionalAuth();
  return accountCurrency(auth?.user?.countryCode);
}
export function useDisplayMoney() {
  const auth = useOptionalAuth();
  const preferred = accountCurrency(auth?.user?.countryCode);
  return (amount: number | undefined, currency: string | undefined) => {
    if (amount == null || !currency) return '—';
    if (!auth?.user || !['USD', 'KES'].includes(currency)) return money(amount, currency);
    return money(convertMinor(amount, currency, preferred), preferred);
  };
}
export function PaymentCurrencyNote({ quote, payout = false }: { quote?: SettlementQuote; payout?: boolean }) {
  if (!quote || quote.currencyCode !== 'KES') return null;
  return <p className="privacy-note" style={{fontSize:12,lineHeight:1.6}}>
    {payout ? 'Eligible Kenyan M-Pesa payouts are sent in' : 'If paying through Paystack, the checkout charge is'}{' '}
    <strong>{money(quote.amountMinor, 'KES')}</strong>.
    {quote.originalCurrencyCode === 'USD' && <> Equivalent to {money(quote.originalAmountMinor, 'USD')} at the fixed Rivera rate: USD 1 = KES {quote.usdKesRate}.</>}
    {!payout && ' Your bank may apply its own conversion or card fees.'}
  </p>;
}
export function AccountCampaignBudget({campaign}: {campaign: Campaign}) {
  const display = useDisplayMoney();
  if(campaign.budgetVisibility === 'HIDDEN' || campaign.budgetMinMinor == null) return <>Budget to be discussed</>;
  return <>{display(campaign.budgetMinMinor,campaign.currencyCode)}{campaign.budgetMaxMinor != null && campaign.budgetMaxMinor !== campaign.budgetMinMinor ? ` – ${display(campaign.budgetMaxMinor,campaign.currencyCode)}` : ''}</>;
}
