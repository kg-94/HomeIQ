import Link from "next/link";

/** Comma-separated tags field (works without JS). */
export function TagInput({ defaultValue, placeholder = "e.g. kitchen, car, tax-2026" }: { defaultValue?: string[] | null; placeholder?: string }) {
  return (
    <div>
      <label htmlFor="tags" className="label">Tags</label>
      <input id="tags" name="tags" defaultValue={(defaultValue ?? []).join(", ")} placeholder={placeholder} autoComplete="off" className="input" />
      <p className="mt-1 text-xs text-muted">Separate with commas. Up to 10.</p>
    </div>
  );
}

export function TagChips({ tags, className = "" }: { tags?: string[] | null; className?: string }) {
  if (!tags?.length) return null;
  return (
    <span className={`flex flex-wrap gap-1 ${className}`}>
      {tags.map((t) => (
        <span key={t} className="rounded-full bg-accent/10 px-2 py-0.5 text-xs text-accent">#{t}</span>
      ))}
    </span>
  );
}

/**
 * Filter chips for a list page: "All" plus every tag in use. `href(tag)` builds
 * the link (keeping the page's other filters); the active tag is highlighted.
 */
export function TagFilter({ tags, current, href }: { tags: string[]; current?: string; href: (tag?: string) => string }) {
  if (!tags.length) return null;
  const chip = (tag: string | undefined, label: string) => (
    <Link
      key={label}
      href={href(tag)}
      aria-current={tag === current ? "page" : undefined}
      className={`shrink-0 rounded-full border px-3 py-1.5 text-sm sm:py-1 ${tag === current ? "border-accent bg-accent/10 text-accent" : "border-border text-muted hover:text-foreground"}`}
    >
      {label}
    </Link>
  );
  return (
    <nav aria-label="Filter by tag" className="flex flex-wrap gap-2">
      {chip(undefined, "All")}
      {tags.map((t) => chip(t, `#${t}`))}
    </nav>
  );
}
