import { oauth } from "@/app/auth/actions";
import type { Provider } from "@/lib/last-login";

const ICON = {
  google: (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4">
      <path fill="#4285F4" d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5a5.6 5.6 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.5-5.2 3.5-8.8z" />
      <path fill="#34A853" d="M12 24c3.2 0 6-1.1 8-2.9l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24z" />
      <path fill="#FBBC05" d="M5.3 14.3a7.2 7.2 0 0 1 0-4.6V6.6H1.3a12 12 0 0 0 0 10.8z" />
      <path fill="#EA4335" d="M12 4.8c1.8 0 3.3.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.6l4 3.1c.9-2.9 3.6-4.9 6.7-4.9z" />
    </svg>
  ),
  discord: (
    <svg aria-hidden viewBox="0 0 24 24" className="size-4" fill="currentColor">
      <path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.6 1.3a18.4 18.4 0 0 0-5.6 0L8.6 3a19.7 19.7 0 0 0-4.9 1.5C.5 9.1-.3 13.7.1 18.2a19.9 19.9 0 0 0 6 3l1.3-2.1a13 13 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4-2 1 1.3 2.1a19.8 19.8 0 0 0 6-3c.5-5.2-.8-9.8-3.6-13.8zM8 15.4c-1.2 0-2.2-1.1-2.2-2.4S6.8 10.6 8 10.6s2.2 1.1 2.2 2.4-1 2.4-2.2 2.4zm8 0c-1.2 0-2.2-1.1-2.2-2.4s1-2.4 2.2-2.4 2.2 1.1 2.2 2.4-1 2.4-2.2 2.4z" />
    </svg>
  ),
};
const LABEL = { google: "Google", discord: "Discord" };

/**
 * Sign-in buttons. `primary` renders that provider as the big one-tap button
 * (returning user) and the others below it; `consent` forces Discord's approval screen.
 */
export default function OAuthButtons({
  next,
  primary,
  consent,
}: {
  next: string;
  primary?: Provider;
  consent?: boolean;
}) {
  const others = (Object.keys(LABEL) as Provider[]).filter((p) => p !== primary);
  return (
    <form action={oauth} className="grid gap-3">
      <input type="hidden" name="next" value={next} />
      {consent && <input type="hidden" name="consent" value="1" />}
      {primary && (
        <button name="provider" value={primary} className="btn gap-2 py-3 text-base">
          <span className={primary === "google" ? "rounded-full bg-white p-0.5" : ""}>{ICON[primary]}</span>
          Continue with {LABEL[primary]}
        </button>
      )}
      {others.map((p) => (
        <button key={p} name="provider" value={p} className="btn-ghost gap-2 py-2.5">
          <span className={p === "discord" ? "text-[#5865F2]" : ""}>{ICON[p]}</span>
          {primary ? `Use ${LABEL[p]} instead` : `Continue with ${LABEL[p]}`}
        </button>
      ))}
    </form>
  );
}
