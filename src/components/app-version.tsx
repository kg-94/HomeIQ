/** "v0.1.0 · 9aa6573" — package.json version plus the build's commit (see next.config.ts). */
export default function AppVersion() {
  const commit = process.env.NEXT_PUBLIC_COMMIT;
  return (
    <p className="py-4 text-center text-xs text-muted">
      HomeIQ v{process.env.NEXT_PUBLIC_APP_VERSION}
      {commit && <span title="Build commit"> · {commit}</span>}
    </p>
  );
}
