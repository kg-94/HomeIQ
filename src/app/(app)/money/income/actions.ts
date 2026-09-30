"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext } from "@/lib/household";
import { amountPaise, fromPaise } from "@/lib/money";

const back = (path: string, error: string) => redirect(`${path}?error=${encodeURIComponent(error)}`);
const PRIVATE_ONLY_YOURS = "Only your own income can be private";

const fields = z.object({
  description: z.string().trim().min(1, "Description is required").max(120),
  amount: amountPaise,
  received_by: z.guid("Choose who received it"),
  date: z.iso.date("Pick a date"),
  category: z.string().trim().max(60).transform((v) => v || null),
  is_private: z.literal("on").optional().transform((v) => v === "on"),
  repeat_every: z.coerce.number().int().min(0).max(999).default(0),
  repeat_unit: z.enum(["day", "week", "month", "year"]).default("month"),
});

/**
 * New income form. With "repeat every" set it creates a recurring source
 * (logged later with Received); otherwise it logs a one-off entry now.
 */
export async function addIncome(formData: FormData) {
  const parsed = fields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/money/income", parsed.error.issues[0].message);
  const d = parsed.data;

  const { supabase, user, active } = await getHouseholdContext();
  if (d.is_private && d.received_by !== user.id) return back("/money/income", PRIVATE_ONLY_YOURS);
  const common = {
    household_id: active.household.id,
    category: d.category,
    amount: fromPaise(d.amount),
    received_by: d.received_by,
    is_private: d.is_private,
  };
  const { error } = d.repeat_every
    ? await supabase.from("income_sources").insert({
        ...common,
        name: d.description,
        next_date: d.date,
        repeat_every: d.repeat_every,
        repeat_unit: d.repeat_unit,
      })
    : await supabase.from("incomes").insert({ ...common, description: d.description, received_on: d.date });
  if (error) return back("/money/income", error.message);
  revalidatePath("/money/income");
  redirect("/money/income");
}

export async function updateIncome(formData: FormData) {
  const id = String(formData.get("id"));
  const path = `/money/income/${id}`;
  const parsed = fields.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(path, parsed.error.issues[0].message);
  const d = parsed.data;

  const { supabase, user } = await getHouseholdContext();
  if (d.is_private && d.received_by !== user.id) return back(path, PRIVATE_ONLY_YOURS);
  const { error } = await supabase
    .from("incomes")
    .update({
      description: d.description,
      category: d.category,
      amount: fromPaise(d.amount),
      received_by: d.received_by,
      received_on: d.date,
      is_private: d.is_private,
    })
    .eq("id", id);
  if (error) return back(path, error.message);
  revalidatePath("/money/income");
  redirect("/money/income");
}

export async function updateSource(formData: FormData) {
  const id = String(formData.get("id"));
  const path = `/money/income/sources/${id}`;
  const parsed = fields
    .refine((d) => d.repeat_every > 0, "Set how often it repeats")
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(path, parsed.error.issues[0].message);
  const d = parsed.data;

  const { supabase, user } = await getHouseholdContext();
  if (d.is_private && d.received_by !== user.id) return back(path, PRIVATE_ONLY_YOURS);
  const { error } = await supabase
    .from("income_sources")
    .update({
      name: d.description,
      category: d.category,
      amount: fromPaise(d.amount),
      received_by: d.received_by,
      next_date: d.date,
      is_private: d.is_private,
      repeat_every: d.repeat_every,
      repeat_unit: d.repeat_unit,
    })
    .eq("id", id);
  if (error) return back(path, error.message);
  revalidatePath("/money/income");
  redirect("/money/income");
}

/** "Received" on a recurring source: logs it (amount editable) and moves it to the next date. */
export async function receiveIncome(formData: FormData) {
  const parsed = z.object({ source: z.guid(), amount: amountPaise }).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/money/income", parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.rpc("receive_income", {
    p_source: parsed.data.source,
    p_amount: fromPaise(parsed.data.amount),
  });
  if (error) return back("/money/income", error.message);
  revalidatePath("/money/income");
}

export async function deleteIncome(formData: FormData) {
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("incomes").delete().eq("id", String(formData.get("id")));
  if (error) return back("/money/income", error.message);
  revalidatePath("/money/income");
  redirect("/money/income");
}

export async function deleteSource(formData: FormData) {
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("income_sources").delete().eq("id", String(formData.get("id")));
  if (error) return back("/money/income", error.message);
  revalidatePath("/money/income");
  redirect("/money/income");
}
