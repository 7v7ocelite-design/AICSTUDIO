import { supabaseAdmin } from "@/lib/supabase";

export async function uploadReferencePhoto(file: File) {
  if (!supabaseAdmin) return null;
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const path = `athletes/${crypto.randomUUID()}.${ext}`;
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabaseAdmin.storage
    .from("reference-photos")
    .upload(path, arrayBuffer, { contentType: file.type, upsert: false });
  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabaseAdmin.storage.from("reference-photos").getPublicUrl(path);
  return data.publicUrl;
}
