import Link from "next/link";
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
          Payments are processed by Stripe Checkout. Rivera stores payment
          status and limited provider references, not card details. Submitted
          proposals reveal the full Campaign brief but never unlock private
          Business contact details.
        </p>
      </section>
    </main>
  );
}
