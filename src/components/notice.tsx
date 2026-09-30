export default function Notice({ error, message }: { error?: string; message?: string }) {
  if (error)
    return (
      <p role="alert" className="mb-4 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
        {error}
      </p>
    );
  if (message)
    return (
      <p role="status" className="mb-4 rounded-md bg-accent/10 px-3 py-2 text-sm text-accent">
        {message}
      </p>
    );
  return null;
}
