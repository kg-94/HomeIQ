import { notFound, redirect } from "next/navigation";
import { type NextRequest } from "next/server";
import { BUCKET } from "@/lib/storage";
import { createClient } from "@/lib/supabase/server";

// Stable link for a stored file: RLS decides visibility, then we hand out a
// short-lived signed URL. ?download=1 forces a download with the original name.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: file } = await supabase.from("files").select("name, storage_path").eq("id", id).maybeSingle();
  if (!file) notFound();

  const download = request.nextUrl.searchParams.has("download") ? file.name : undefined;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(file.storage_path, 60, { download });
  if (error || !data) notFound();
  redirect(data.signedUrl);
}
