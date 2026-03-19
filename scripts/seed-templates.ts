import { createClient } from "@supabase/supabase-js";
import { TEMPLATE_SEED_DATA } from "../lib/seed/templates";

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }

  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { error } = await client.from("templates").upsert(TEMPLATE_SEED_DATA, {
    onConflict: "category,variant",
  });
  if (error) throw error;

  const { count } = await client.from("templates").select("id", { count: "exact", head: true });
  console.log(`Seed complete: ${count ?? 0} templates in table.`);
}

main().catch((error) => {
  console.error("Template seed failed:", error);
  process.exit(1);
});
