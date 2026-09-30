import Link from "next/link";
import AppVersion from "./app-version";

export const OPERATOR = "K10 Apps Labs";
export const CONTACT_EMAIL = "k10appslabs@gmail.com";

export default function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <Link href="/" className="font-semibold tracking-tight">
        Home<span className="text-accent">IQ</span>
      </Link>
      <h1 className="mt-8 text-3xl font-semibold">{title}</h1>
      <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
      <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_a]:text-accent [&_a]:underline">
        {children}
      </div>
      <nav className="mt-12 flex gap-4 text-sm text-muted">
        <Link href="/privacy" className="hover:text-foreground">Privacy Policy</Link>
        <Link href="/terms" className="hover:text-foreground">Terms of Service</Link>
      </nav>
      <AppVersion />
    </main>
  );
}
