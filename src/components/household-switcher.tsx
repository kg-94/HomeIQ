"use client";

import { switchHousehold } from "@/app/(app)/household/actions";

export default function HouseholdSwitcher({
  households,
  activeId,
}: {
  households: { id: string; name: string }[];
  activeId: string;
}) {
  if (households.length < 2) return <span className="font-medium">{households[0]?.name}</span>;
  return (
    <form action={switchHousehold}>
      <label htmlFor="household_id" className="sr-only">Household</label>
      <select
        id="household_id"
        name="household_id"
        defaultValue={activeId}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-border bg-surface px-2 py-1 text-sm font-medium"
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
      </select>
    </form>
  );
}
