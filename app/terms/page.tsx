import Link from "next/link";
export const metadata={title:'Terms of Service',description:'The terms governing creator and business accounts, campaigns, proposals, fees and collaborations on Rivera.',alternates:{canonical:'/terms'}};
export default function Terms() {
  return (
    <main className="legal-page">
      <Link href="/" className="brand">
        <span className="brand-mark">R.</span>rivera
      </Link>
      <h1>Terms of Service</h1>
      <p>
        Rivera accounts are provided for lawful business and creator
        collaboration. Users are responsible for accurate account information,
        protecting their credentials, and following applicable laws.
      </p>
      <section id="application-fees">
        <h2>Campaign proposals and Application Fees</h2>
        <p>
          A Creator’s proposed campaign price is the amount they would like a
          Business to pay if selected. It is separate from Rivera’s Application
          Fee, which is charged only to submit a proposal and does not guarantee
          selection, hiring, payment, or campaign completion.
        </p>
        <p>
          Eligible free Application Credits waive Rivera’s fee for one
          submission. Credits have no cash value and cannot be transferred.
          Zero-fee campaigns do not consume a credit. Voluntary withdrawals and
          unsuccessful proposals are generally non-refundable. Rivera may issue
          a full refund for duplicate or erroneous charges, cancelled Campaigns,
          or other cases approved by an administrator.
        </p>
        <p>
          Payments are processed through the configured provider, including Paystack. Rivera stores payment
          status and limited provider references, not card details. Submitted
          proposals reveal the full Campaign brief but never unlock private
          Business contact details.
        </p>
      </section>
      <section id="wise-payouts"><h2>International Wise payouts</h2><p>International creator payouts use an admin-assisted Wise process. Creators must provide their own legal account name and payout email, verify access to that email, and complete Rivera’s recipient review. Availability depends on Wise’s supported routes and receiving requirements.</p><p>Business funding and release are separate from receipt of money. Queued or claimed payouts are not completed payments. A Rivera administrator sends the transfer in Wise and records its completed transfer ID. Wise may require the recipient to claim a payment or provide further receiving information. Contact support@riveracreators.com if a recorded payout has not arrived.</p><p>Amounts are displayed in USD for international accounts. Paystack collections use the disclosed KES settlement amount at Rivera’s fixed USD 1 = KES 130 rate. Wise and bank charges or conversion rates are separate; admins must check the recipient amount before recording completion.</p></section>
      <section id="weekly-payouts"><h2>Weekly payout schedule</h2><p>After completed work is approved, the Business can approve release into the following calendar week’s Monday batch at 09:00 Kenya time (Africa/Nairobi). Monday approvals enter the next Monday’s batch, even before 09:00. Funds remain reserved until payment, account and dispute checks pass.</p><p>Scheduled and processing amounts are not money received. M-Pesa transfers use the payout provider; Wise remains admin-assisted and is only made available to an administrator on the scheduled date. Holds, provider availability, treasury funding or manual processing can delay receipt. No instant withdrawal or guaranteed Monday arrival is offered. Contact <a href="mailto:support@riveracreators.com">support@riveracreators.com</a> about delayed payouts.</p></section>
    </main>
  );
}
