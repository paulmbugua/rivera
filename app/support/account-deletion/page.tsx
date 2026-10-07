import Link from "next/link";

export const metadata = {
  title: "Delete your Rivera account",
  description:
    "How Rivera creators and businesses can request account and personal-data deletion.",
};

export default function AccountDeletionPage() {
  return (
    <main className="legal-page">
      <Link href="/" className="brand">
        <span className="brand-mark">R.</span>rivera
      </Link>

      <h1>Delete your Rivera account</h1>
      <p>
        Rivera is operated by the Rivera team. Creators and businesses can
        request deletion of their Rivera account and associated personal data
        from the web or mobile app.
      </p>

      <h2>Request deletion in Rivera</h2>
      <ol>
        <li>Sign in to your Rivera account.</li>
        <li>Open your profile and select <strong>Settings</strong>.</li>
        <li>Open <strong>Data and privacy</strong>.</li>
        <li>Select <strong>Request account deletion</strong> and confirm.</li>
      </ol>
      <p>
        If you cannot sign in, use Rivera&apos;s password-reset option first. You
        may also contact Rivera support using the support channel shown in the
        app and include the email address attached to the account. We may ask
        you to verify ownership before processing the request.
      </p>

      <h2>What is deleted</h2>
      <p>
        After the request is verified and approved, Rivera deletes or
        irreversibly de-identifies account details and personal profile data,
        including your name, contact details, profile biography, profile
        images, social-account links, portfolio media, saved items, and active
        authentication sessions, except where retention is required as
        described below.
      </p>

      <h2>Information that may be retained</h2>
      <p>
        Rivera may retain limited transaction, campaign, payment, dispute,
        fraud-prevention, security, and audit records when required to meet
        legal, accounting, safety, or contractual obligations. Retained records
        are restricted and kept only for the applicable retention period, then
        deleted or de-identified.
      </p>

      <h2>Processing time</h2>
      <p>
        Rivera reviews deletion requests and will complete eligible requests
        as soon as reasonably possible. Access to the account may be disabled
        while a request is being processed. You will be contacted if more
        information is required.
      </p>

      <p>
        Read the <Link href="/privacy">Rivera Privacy Policy</Link> for more
        information about how data is handled.
      </p>
    </main>
  );
}
