import { TagInput } from "@/components/tags";
type Item = {
  id: string;
  name: string;
  category: string | null;
  location: string | null;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchased_on: string | null;
  warranty_expires_on: string | null;
  price: number | null;
  notes: string | null;
  tags?: string[];
};

const CATEGORIES = ["Appliance", "Electronics", "Furniture", "Kitchen", "Vehicle", "Tools", "Other"];

function Field({ name, label, ...props }: { name: string; label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={name} className="label">{label}</label>
      <input id={name} name={name} className="input" {...props} />
    </div>
  );
}

export default function ItemForm({
  action,
  item,
  currency,
  submitLabel,
}: {
  action: (formData: FormData) => Promise<void>;
  item?: Item;
  currency: string;
  submitLabel: string;
}) {
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      {item && <input type="hidden" name="id" value={item.id} />}
      <div className="sm:col-span-2">
        <Field name="name" label="Name" defaultValue={item?.name} placeholder="e.g. Samsung fridge" required maxLength={120} />
      </div>
      <Field name="category" label="Category" defaultValue={item?.category ?? ""} list="categories" maxLength={60} />
      <datalist id="categories">
        {CATEGORIES.map((c) => <option key={c} value={c} />)}
      </datalist>
      <Field name="location" label="Location" defaultValue={item?.location ?? ""} placeholder="e.g. Kitchen" maxLength={60} />
      <Field name="brand" label="Brand" defaultValue={item?.brand ?? ""} maxLength={60} />
      <Field name="model" label="Model" defaultValue={item?.model ?? ""} maxLength={60} />
      <Field name="serial_number" label="Serial number" defaultValue={item?.serial_number ?? ""} maxLength={100} />
      <Field name="price" label={`Price (${currency})`} defaultValue={item?.price ?? ""} type="number" min={0} step="0.01" inputMode="decimal" />
      <Field name="purchased_on" label="Purchased on" defaultValue={item?.purchased_on ?? ""} type="date" />
      <Field name="warranty_expires_on" label="Warranty until" defaultValue={item?.warranty_expires_on ?? ""} type="date" />
      <div className="sm:col-span-2">
        <label htmlFor="notes" className="label">Notes</label>
        <textarea id="notes" name="notes" defaultValue={item?.notes ?? ""} rows={2} maxLength={2000} className="input" />
      </div>
      {!item && (
        <div className="sm:col-span-2">
          <label htmlFor="receipt" className="label">Receipt or invoice (optional)</label>
          <input id="receipt" name="receipt" type="file" accept="application/pdf,image/*" className="text-sm" />
        </div>
      )}
      <div className="sm:col-span-2">
        <TagInput defaultValue={item?.tags} />
      </div>
      <div className="sm:col-span-2">
        <button className="btn">{submitLabel}</button>
      </div>
    </form>
  );
}
