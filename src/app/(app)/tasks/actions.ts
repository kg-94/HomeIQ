"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getHouseholdContext } from "@/lib/household";

const task = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(120),
    notes: z.string().trim().max(2000).transform((v) => v || null),
    due_date: z.iso.date("Pick a due date"),
    assignee_id: z.string().transform((v) => v || null),
    item_id: z.string().optional().transform((v) => v || null),
    repeat_every: z.coerce.number().int().min(0).max(999),
    repeat_unit: z.enum(["day", "week", "month", "year"]),
  })
  // repeat_every 0 = doesn't repeat
  .transform(({ repeat_every, repeat_unit, ...rest }) => ({
    ...rest,
    repeat_every: repeat_every || null,
    repeat_unit: repeat_every ? repeat_unit : null,
  }));

const back = (path: string, error: string) => redirect(`${path}?error=${encodeURIComponent(error)}`);

export async function createTask(formData: FormData) {
  const parsed = task.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back("/tasks", parsed.error.issues[0].message);

  const { supabase, active } = await getHouseholdContext();
  const { error } = await supabase.from("tasks").insert({ ...parsed.data, household_id: active.household.id });
  if (error) return back("/tasks", error.message);
  revalidatePath("/", "layout");
  redirect("/tasks");
}

export async function updateTask(formData: FormData) {
  const id = String(formData.get("id"));
  const parsed = task.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return back(`/tasks/${id}`, parsed.error.issues[0].message);

  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("tasks").update(parsed.data).eq("id", id);
  if (error) return back(`/tasks/${id}`, error.message);
  revalidatePath("/", "layout");
  redirect("/tasks");
}

export async function completeTask(formData: FormData) {
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.rpc("complete_task", { task: String(formData.get("id")) });
  if (error) return back("/tasks", error.message);
  revalidatePath("/", "layout");
}

export async function deleteTask(formData: FormData) {
  const { supabase } = await getHouseholdContext();
  const { error } = await supabase.from("tasks").delete().eq("id", String(formData.get("id")));
  if (error) return back("/tasks", error.message);
  revalidatePath("/", "layout");
  redirect("/tasks");
}
