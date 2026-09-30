"use client";

import { useRouter } from "next/navigation";
import { switchHousehold } from "@/app/(app)/household/actions";

const NEW = "__new";

export default function HouseholdSwitcher({
  households,
  activeId,
}: {
  households: { id: string; name: string }[];
  activeId: string;
}) {
  const router = useRouter();
  if (households.length < 2) return <span className="block truncate font-medium">{households[0]?.name}</span>;
  return (
    <form action={switchHousehold}>
      <label htmlFor="household_id" className="sr-only">Household</label>
      {/* key: the header stays mounted across navigations, and defaultValue only
          applies on mount, so remount when the active household changes. */}
      <select
        key={activeId}
        id="household_id"
        name="household_id"
        defaultValue={activeId}
        onChange={(e) => (e.currentTarget.value === NEW ? router.push("/onboarding") : e.currentTarget.form?.requestSubmit())}
        className="max-w-full truncate rounded-md border border-border bg-surface px-2 py-1 text-base font-medium sm:text-sm"
      >
        {households.map((h) => (
          <option key={h.id} value={h.id}>{h.name}</option>
        ))}
        <option value={NEW}>+ New household…</option>
      </select>
    </form>
  );
}
