import type { SupabaseClient } from "@supabase/supabase-js";
import type { Job } from "@/lib/types";

interface CreateJobParams {
  athlete_id: string;
  template_id: string;
  status?: string;
  assembled_prompt?: string | null;
  output_filename?: string | null;
  retry_count?: number;
}

interface UpdateJobParams {
  status?: string;
  face_score?: number;
  video_url?: string | null;
  engine_used?: string | null;
  file_name?: string | null;
  retry_count?: number;
  reviewed_at?: string | null;
}

const JOB_SELECT = "*, athlete:athletes(name), template:templates(variant_name, category, location)";

export const createJob = async (
  supabase: SupabaseClient,
  params: CreateJobParams
): Promise<{ id: string }> => {
  // Try RPC first (bypasses PostgREST schema cache)
  try {
    const { data: rpcId, error: rpcError } = await supabase.rpc("create_job", {
      p_athlete_id: params.athlete_id,
      p_template_id: params.template_id,
      p_status: params.status ?? "queued",
      p_assembled_prompt: params.assembled_prompt ?? null,
      p_output_filename: params.output_filename ?? null,
      p_retry_count: params.retry_count ?? 0
    });

    if (!rpcError && rpcId) {
      return { id: rpcId as string };
    }
  } catch {
    // RPC not available — try fallback
  }

  // Fallback: insert with only core columns PostgREST definitely knows
  const { data, error } = await supabase
    .from("jobs")
    .insert({
      athlete_id: params.athlete_id,
      template_id: params.template_id,
      status: params.status ?? "queued"
    })
    .select("id")
    .single();

  if (error || !data) throw new Error(error?.message ?? "Unable to create job.");
  return { id: data.id };
};

export const updateJob = async (
  supabase: SupabaseClient,
  jobId: string,
  params: UpdateJobParams
): Promise<void> => {
  // Try RPC first
  try {
    const { error: rpcError } = await supabase.rpc("update_job", {
      p_id: jobId,
      p_status: params.status ?? null,
      p_face_score: params.face_score ?? null,
      p_video_url: params.video_url ?? null,
      p_engine_used: params.engine_used ?? null,
      p_file_name: params.file_name ?? null,
      p_retry_count: params.retry_count ?? null,
      p_reviewed_at: params.reviewed_at ?? null
    });

    if (!rpcError) return;
  } catch {
    // RPC not available — try fallback
  }

  // Fallback: update only safe columns (status, face_score, video_url, engine_used are in original schema)
  const updates: Record<string, unknown> = {};
  if (params.status !== undefined) updates.status = params.status;
  if (params.face_score !== undefined) updates.face_score = params.face_score;
  if (params.video_url !== undefined) updates.video_url = params.video_url;
  if (params.engine_used !== undefined) updates.engine_used = params.engine_used;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("jobs").update(updates).eq("id", jobId);
    if (error) throw new Error(error.message);
  }
};

export const fetchJob = async (
  supabase: SupabaseClient,
  jobId: string
): Promise<Job> => {
  const { data, error } = await supabase
    .from("jobs")
    .select(JOB_SELECT)
    .eq("id", jobId)
    .single();

  if (error || !data) throw new Error(error?.message ?? "Job not found.");
  return data as Job;
};

export const createMockJobs = async (
  supabase: SupabaseClient,
  jobs: Array<Record<string, unknown>>
): Promise<Job[]> => {
  // Try RPC first
  try {
    const { data: rpcIds, error: rpcError } = await supabase.rpc("create_mock_jobs", {
      p_jobs: JSON.stringify(jobs)
    });

    if (!rpcError && rpcIds) {
      const ids = (rpcIds as Array<string>).filter(Boolean);
      if (ids.length > 0) {
        const { data } = await supabase
          .from("jobs")
          .select(JOB_SELECT)
          .in("id", ids)
          .order("created_at", { ascending: false });
        return (data ?? []) as Job[];
      }
    }
  } catch {
    // RPC not available — try fallback
  }

  // Fallback: insert with only core columns
  const safeJobs = jobs.map((j) => ({
    athlete_id: j.athlete_id,
    template_id: j.template_id,
    status: j.status,
    face_score: j.face_score,
    video_url: j.video_url,
    engine_used: j.engine_used
  }));

  const { data, error } = await supabase
    .from("jobs")
    .insert(safeJobs)
    .select(JOB_SELECT)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as Job[];
};
