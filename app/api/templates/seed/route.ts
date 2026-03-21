import { NextRequest, NextResponse } from "next/server";

import { mapApiError, requireAuthenticatedOperator } from "@/lib/api";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { seedDefaultTemplates } from "@/lib/seed-templates";

export async function POST(request: NextRequest) {
  try {
    await requireAuthenticatedOperator(request);
    const supabase = getAdminSupabase();

    const { count: before } = await supabase
      .from("templates")
      .select("id", { count: "exact", head: true });

    if ((before ?? 0) > 0) {
      return NextResponse.json(
        { error: "Templates already exist. Seed skipped to avoid duplicates." },
        { status: 409 }
      );
    }

    await seedDefaultTemplates(supabase);

    const { count: after } = await supabase
      .from("templates")
      .select("id", { count: "exact", head: true });

    return NextResponse.json({ data: { seeded: after ?? 0 } }, { status: 201 });
  } catch (error) {
    const { status, message } = mapApiError(error);
    return NextResponse.json({ error: message }, { status });
  }
}
