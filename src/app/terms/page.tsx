import type { Metadata } from "next";
import Link from "next/link";
import LegalPage, { CONTACT_EMAIL, OPERATOR } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="30 September 2026">
      <p>
        These terms apply to your use of HomeIQ, run by {OPERATOR} (&ldquo;we&rdquo;). By signing in, you agree to them.
        If you don&apos;t agree, please don&apos;t use HomeIQ.
      </p>

      <h2>The service</h2>
      <p>
        HomeIQ helps a household keep track of maintenance tasks, belongings and warranties, bills and shared expenses,
        and documents. It is currently free. We may change, add or remove features, and we&apos;ll try to give notice of
        changes that affect you significantly.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>You sign in with Google or Discord and are responsible for keeping that account secure.</li>
        <li>You must be at least 13 years old, and old enough to agree to these terms where you live.</li>
        <li>Give accurate information and don&apos;t impersonate anyone.</li>
      </ul>

      <h2>Households</h2>
      <p>
        Everything added to a household is shared with all its members. Only invite people you trust. Household
        owners can rename the household, invite people and remove members. You can leave a household at any time.
      </p>

      <h2>Your content</h2>
      <p>
        You own what you add to HomeIQ. You give us permission to store, process and display it only as needed to run
        the service for you and your household. You&apos;re responsible for having the right to upload it.
      </p>

      <h2>Acceptable use</h2>
      <p>Don&apos;t use HomeIQ to:</p>
      <ul>
        <li>break the law or infringe anyone&apos;s rights;</li>
        <li>upload malware, or content that is illegal, abusive or not yours to share;</li>
        <li>try to access other households&apos; data, or disrupt, overload or reverse-engineer the service.</li>
      </ul>
      <p>We may suspend or remove accounts that break these rules.</p>

      <h2>Money features are records, not advice</h2>
      <p>
        Bills, expenses and balances are records to help your household keep track. HomeIQ doesn&apos;t move money, and
        it isn&apos;t financial, legal or tax advice. Check important amounts and dates yourself.
      </p>

      <h2>No warranty</h2>
      <p>
        HomeIQ is provided &ldquo;as is&rdquo;. We work to keep it available and your data safe, but we don&apos;t
        guarantee it will be uninterrupted or error-free. Keep your own copies of important documents.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the extent the law allows, we aren&apos;t liable for indirect or consequential losses, or for lost data,
        missed payments or missed deadlines arising from use of HomeIQ. Since the service is free, our total liability
        is limited to INR 1,000.
      </p>

      <h2>Ending</h2>
      <p>
        You can stop using HomeIQ at any time, and ask us to delete your account as described in the{" "}
        <Link href="/privacy">Privacy Policy</Link>. We may end the service with reasonable notice.
      </p>

      <h2>Law</h2>
      <p>These terms are governed by the laws of India.</p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>
    </LegalPage>
  );
}
