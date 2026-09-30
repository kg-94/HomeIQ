"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext } from "@/lib/household";
import { fromPaise, splitEqually, toPaise } from "@/lib/money";

const back = (path: string, error: string) => redirect(`${path}?error=${encodeURIComponent(error)}`);

const money = (label: string) =>
  z
    .string()
    .transform((v) => toPaise(v) ?? -1)
    .pipe(z.number().int().positive(`Enter a valid ${label}`));

const expense = z.object({
  description: z.string().trim().min(1, "Description is required").max(120),
  amount: money("amount"),
  paid_by: z.guid("Choose who paid"),
  spent_on: z.iso.date("Pick a date"),
  category: z.string().trim().max(60).transform((v) => v || null),
  split: z.enum(["equal", "exact"]),
});

/**
 * Builds splits from the form: `in_<user>` checkboxes for an equal split, or
 * `share_<user>` amounts for exact. Returns an error string or the splits.
 */
function readSplits(formData: FormData, memberIds: string[], totalPaise: number, mode: "equal" | "exact") {
  if (mode === "equal") {
    const ids = memberIds.filter((id) => formData.get(`in_${id}`) === "on");
    if (ids.length === 0) return "Pick at least one person to split with";
    const shares = splitEqually(totalPaise, ids.length);
    return ids.map((user_id, i) => ({ user_id, share: fromPaise(shares[i]) }));
  }
  const splits: { user_id: string; paise: number }[] = [];
  for (const user_id of memberIds) {
    const raw = String(formData.get(`share_${user_id}`) ?? "").trim();
    if (!raw) continue;
    const paise = toPaise(raw);
    if (paise === null) return "Enter valid amounts for each person";
    if (paise > 0) splits.push({ user_id, paise });
  }
  const sum = splits.reduce((a, s) => a + s.paise, 0);
  if (sum !== totalPaise)
    return `Shares add up to ${fromPaise(sum).toFixed(2)}, but the amount is ${fromPaise(totalPaise).toFixed(2)}`;
  return splits.map(({ user_id, paise }) => ({ user_id, share: fromPaise(paise) }));
}

export async function saveExpense(formData: FormData) {
  const id = String(formData.get("id") ?? "") || null;
  const path = id ? `/money/expenses/${id}` : "/money";
  const parsed = expense.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(path, parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const hid = active.household.id;
  const { data: members } = await supabase.from("household_members").select("user_id").eq("household_id", hid);
  const splits = readSplits(formData, members?.map((m) => m.user_id) ?? [], parsed.data.amount, parsed.data.split);
  if (typeof splits === "string") return back(path, splits);

  const { error } = await supabase.rpc("save_expense", {
    p_id: id!,
    p_household: hid,
    p_description: parsed.data.description,
    p_amount: fromPaise(parsed.data.amount),
    p_paid_by: parsed.data.paid_by,
    p_spent_on: parsed.data.spent_on,
    p_category: parsed.data.category!,
    p_splits: splits,
  });
  if (error) return back(path, error.message);
  revalidatePath("/", "layout");
  redirect("/money");
}

export async function deleteExpense(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("expenses").delete().eq("id", id);
  if (error) return back(`/money/expenses/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect("/money");
}

export async function recordSettlement(formData: FormData) {
  const parsed = z
    .object({
      from_user: z.guid(),
      to_user: z.guid(),
      amount: money("amount"),
      settled_on: z.iso.date(),
    })
    .refine((s) => s.from_user !== s.to_user, "Pick two different people")
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/money", parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { error } = await supabase
    .from("settlements")
    .insert({ ...parsed.data, amount: fromPaise(parsed.data.amount), household_id: active.household.id });
  if (error) return back("/money", error.message);
  revalidatePath("/", "layout");
  redirect("/money");
}

export async function deleteSettlement(formData: FormData) {
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("settlements").delete().eq("id", String(formData.get("id")));
  if (error) return back("/money", error.message);
  revalidatePath("/", "layout");
}

const bill = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    payee: z.string().trim().max(120).transform((v) => v || null),
    category: z.string().trim().max(60).transform((v) => v || null),
    amount: money("amount"),
    due_date: z.iso.date("Pick a due date"),
    repeat_every: z.coerce.number().int().min(0).max(999),
    repeat_unit: z.enum(["day", "week", "month", "year"]),
    autopay: z.literal("on").optional(),
    notes: z.string().trim().max(2000).transform((v) => v || null),
  })
  .transform(({ repeat_every, repeat_unit, amount, autopay, ...rest }) => ({
    ...rest,
    amount: fromPaise(amount),
    autopay: autopay === "on",
    repeat_every: repeat_every || null,
    repeat_unit: repeat_every ? repeat_unit : null,
  }));

export async function saveBill(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const path = id ? `/money/bills/${id}` : "/money/bills";
  const parsed = bill.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(path, parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { error } = id
    ? await supabase.from("bills").update(parsed.data).eq("id", id)
    : await supabase.from("bills").insert({ ...parsed.data, household_id: active.household.id });
  if (error) return back(path, error.message);
  revalidatePath("/", "layout");
  redirect("/money/bills");
}

export async function deleteBill(formData: FormData) {
  const id = String(formData.get("id"));
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) return back(`/money/bills/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect("/money/bills");
}

/** Records the payment as an expense split equally among current members. */
export async function payBill(formData: FormData) {
  const parsed = z
    .object({ bill: z.guid(), paid_by: z.guid("Choose who paid"), amount: money("amount") })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/money/bills", parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.rpc("pay_bill", {
    p_bill: parsed.data.bill,
    p_paid_by: parsed.data.paid_by,
    p_amount: fromPaise(parsed.data.amount),
  });
  if (error) return back("/money/bills", error.message);
  revalidatePath("/", "layout");
}
