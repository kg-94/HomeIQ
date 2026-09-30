import Link from "next/link";
import { getHouseholdContext } from "@/lib/household";

const upcoming = ["Maintenance & tasks", "Inventory & warranties", "Bills & expenses", "Documents"];

export default async function HomePage() {
  const { active } = await getHouseholdContext();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Hi, {active.display_name}</h1>
        <p className="mt-1 text-muted">{active.household.name}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {upcoming.map((title) => (
          <div key={title} className="card">
            <h2 className="font-medium">{title}</h2>
            <p className="mt-1 text-sm text-muted">Coming soon.</p>
          </div>
        ))}
      </div>
      <p className="text-sm text-muted">
        Invite the rest of your household from <Link href="/household" className="link">Household settings</Link>.
      </p>
    </div>
  );
}
