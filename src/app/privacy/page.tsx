import type { Metadata } from "next";
import LegalPage, { CONTACT_EMAIL, OPERATOR } from "@/components/legal-page";
import { providerList } from "@/lib/providers";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="30 September 2026">
      <p>
        HomeIQ is run by {OPERATOR} (&ldquo;we&rdquo;). This policy explains what we collect when you use HomeIQ, why,
        and the choices you have. We keep it short because we collect little.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>Your account.</strong> When you sign in with {providerList()}, we receive your name, email address,
          profile picture and a provider account ID. We don&apos;t receive or store a password.
        </li>
        <li>
          <strong>What you and your household add.</strong> Household name and members, tasks, inventory items (including
          details like brand, serial number, price and warranty dates), bills, expenses and how they&apos;re split,
          settle-ups, invite emails, and files you upload such as receipts, manuals and documents.
        </li>
        <li>
          <strong>Cookies.</strong> Only what&apos;s needed to run the app: a sign-in session cookie, one that remembers
          which household you&apos;re viewing, and one that remembers the last account used on this device (its name,
          email and which provider it was) so logging in again is one tap. &ldquo;Not you?&rdquo; on the
          login page removes it. No advertising or analytics cookies.
        </li>
        <li>
          <strong>Basic server logs.</strong> Our hosting provider records requests (such as IP address, time and page)
          to keep the service running and secure.
        </li>
      </ul>

      <h2>How we use it</h2>
      <p>
        Only to provide HomeIQ: signing you in, showing your household&apos;s information to its members, and keeping
        the service secure. We don&apos;t sell your data, show ads, or use your data to train AI models.
      </p>

      <h2>Who can see your data</h2>
      <ul>
        <li>
          <strong>Your household.</strong> Everything in a household, including uploaded files, is visible to all its
          members. Anyone you invite and who joins can see it too.
        </li>
        <li>
          <strong>Service providers</strong> that run HomeIQ for us: Supabase (database, sign-in and file storage),
          Cloudflare (hosting), and {providerList()} (sign-in only). They process data on our behalf under their own
          security and privacy terms.
        </li>
        <li>
          <strong>If the law requires it.</strong> We&apos;ll disclose data only when legally required to.
        </li>
      </ul>

      <h2>Security</h2>
      <p>
        Data is sent over HTTPS. The database only lets you reach households you belong to, and uploaded files are
        kept private and shared through short-lived links. No system is perfectly secure, so please don&apos;t upload
        anything you couldn&apos;t afford to have exposed, such as full card numbers or passwords.
      </p>

      <h2 id="data-deletion">Keeping and deleting your data</h2>
      <p>
        We keep your data while your account exists. You can delete items, files and expenses yourself at any time,
        and leave a household from its settings page. You can delete your account yourself from the Account page: it
        removes your account, your private income, and any household where you&apos;re the only person with an account
        (with its files). Shared household records, such as expenses you were part of, stay with the household so other
        members&apos; balances remain correct, but they&apos;re no longer linked to your name. You can also email us at{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> and we&apos;ll do it within 30 days.
      </p>

      <p>To delete your account and data yourself:</p>
      <ol className="ml-5 list-decimal space-y-1">
        <li>Sign in to HomeIQ and open <strong>Account</strong> (your photo at the top right on phones).</li>
        <li>If you&apos;re the only owner of a household others use, make someone else owner first (Household &rarr; Members &rarr; Make owner).</li>
        <li>Under <strong>Delete account</strong>, type DELETE and confirm. Deletion is immediate.</li>
      </ol>

      <h2>Your rights</h2>
      <p>
        You can ask to see, correct or delete your personal data, or ask a question about this policy, by emailing{" "}
        <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>. We&apos;ll reply within 30 days.
      </p>

      <h2>Children</h2>
      <p>HomeIQ isn&apos;t meant for children under 13 and we don&apos;t knowingly collect their data.</p>

      <h2>Changes</h2>
      <p>
        If we change this policy, we&apos;ll update the date above. For significant changes, we&apos;ll let signed-in
        users know in the app.
      </p>
    </LegalPage>
  );
}
