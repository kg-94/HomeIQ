"use client";

import { useState } from "react";

/** Copies `${origin}${path}`; origin comes from the browser so no site-URL config is needed. */
export default function CopyLink({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="btn-ghost"
      onClick={async () => {
        await navigator.clipboard.writeText(`${window.location.origin}${path}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
