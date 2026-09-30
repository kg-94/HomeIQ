import Link from "next/link";

/**
 * The household's categories as a picker. A value no longer in the list (e.g.
 * an old entry) stays selectable so saving the form doesn't silently drop it.
 */
export default function CategorySelect({
  id = "category",
  options,
  defaultValue,
}: {
  id?: string;
  options: string[];
  defaultValue?: string | null;
}) {
  const all = defaultValue && !options.includes(defaultValue) ? [defaultValue, ...options] : options;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={id} className="label">Category</label>
        <Link href="/money/categories" className="link text-xs">Manage</Link>
      </div>
      <select id={id} name="category" defaultValue={defaultValue ?? ""} className="input">
        <option value="">Uncategorised</option>
        {all.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
    </div>
  );
}
