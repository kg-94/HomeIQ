import { TagInput } from "@/components/tags";
import { DOC_CATEGORIES } from "@/lib/storage";

/** Name / category / expiry inputs shared by the upload and edit forms. */
export default function DocumentFields({
  name,
  category,
  expiresOn,
  tags,
  namePlaceholder,
}: {
  name?: string;
  category?: string | null;
  expiresOn?: string | null;
  tags?: string[];
  namePlaceholder?: string;
}) {
  return (
    <>
      <div className="sm:col-span-2">
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" defaultValue={name} placeholder={namePlaceholder} maxLength={200} className="input" />
      </div>
      <div>
        <label htmlFor="category" className="label">Category</label>
        <select id="category" name="category" defaultValue={category ?? "other"} className="input">
          {Object.entries(DOC_CATEGORIES).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="expires_on" className="label">Expires on (optional)</label>
        <input id="expires_on" name="expires_on" type="date" defaultValue={expiresOn ?? ""} className="input" />
      </div>
      <div className="sm:col-span-2">
        <TagInput defaultValue={tags} />
      </div>
    </>
  );
}
