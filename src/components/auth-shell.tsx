import AppVersion from "./app-version";
import Notice from "./notice";

export default function AuthShell({
  title,
  subtitle,
  error,
  message,
  children,
}: {
  title: string;
  subtitle?: string;
  error?: string;
  message?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <p className="mb-8 text-center text-lg font-semibold tracking-tight">
          Home<span className="text-accent">IQ</span>
        </p>
        <div className="card">
          <h1 className="text-xl font-semibold">{title}</h1>
          {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
          <div className="mt-5">
            <Notice error={error} message={message} />
            {children}
          </div>
        </div>
        <AppVersion />
      </div>
    </main>
  );
}
