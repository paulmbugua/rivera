export const wiseReady = (account?: {provider:string;payoutsEnabled:boolean;onboardingStatus:string;wiseEmailVerifiedAt?:Date|null}|null) =>
  account?.provider === 'WISE' && account.payoutsEnabled && account.onboardingStatus === 'ACTIVE' && !!account.wiseEmailVerifiedAt;
import { convertMinor, USD_KES_RATE } from '../applications/currency-policy';
export const wisePayoutQuote = (amountMinor:number,currencyCode:string) => ({amountMinor:convertMinor(amountMinor,currencyCode,'USD'),currencyCode:'USD',originalAmountMinor:amountMinor,originalCurrencyCode:currencyCode,usdKesRate:USD_KES_RATE});
