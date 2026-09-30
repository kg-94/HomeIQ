import pkg from "../../package.json";

/**
 * "v0.1.5 · 9aa6573". The version is imported (not baked into next.config) so
 * `next dev` hot-reloads it when the pre-commit hook bumps package.json.
 * The commit is fixed at build time; locally it reads "dev".
 */
export default function AppVersion() {
  const commit = process.env.NEXT_PUBLIC_COMMIT;
  return (
    <p className="py-4 text-center text-xs text-muted">
      HomeIQ v{pkg.version}
      {commit && <span title="Build commit"> · {commit}</span>}
    </p>
  );
}
