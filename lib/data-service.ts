import { TEMPLATE_SEED_DATA } from "@/lib/seed/templates";
import { getMemoryStore } from "@/lib/store";
import { Athlete, DashboardStats, Job, JobStatus, Settings, Template } from "@/lib/types";
import { supabaseAdmin } from "@/lib/supabase";

type AthleteInput = Omit<Athlete, "id" | "created_at" | "updated_at">;
type TemplateInput = Omit<Template, "id" | "created_at" | "updated_at">;
type JobInput = Omit<Job, "id" | "created_at" | "updated_at">;

function nowIso() {
  return new Date().toISOString();
}

function sortByCreatedDesc<T extends { created_at: string }>(rows: T[]) {
  return [...rows].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
}

function inRange(dateIso: string, from: Date) {
  return +new Date(dateIso) >= +from;
}

function providerCostByTier(tier: Template["content_tier"]) {
  if (tier === "premium") return 0.25;
  if (tier === "social") return 0.12;
  return 0.08;
}

function calculateStats(athletes: Athlete[], jobs: Job[], templates: Template[]): DashboardStats {
  const now = new Date();
  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);

  const startWeek = new Date(now);
  startWeek.setDate(startWeek.getDate() - 7);

  const startMonth = new Date(now);
  startMonth.setDate(startMonth.getDate() - 30);

  const videosToday = jobs.filter((job) => inRange(job.created_at, startToday)).length;
  const videosWeek = jobs.filter((job) => inRange(job.created_at, startWeek)).length;
  const videosMonth = jobs.filter((job) => inRange(job.created_at, startMonth)).length;
  const approved = jobs.filter((job) => job.status === "approved").length;
  const scored = jobs.filter((job) => job.face_score !== null);
  const avgFaceScore = scored.length
    ? scored.reduce((acc, job) => acc + (job.face_score ?? 0), 0) / scored.length
    : 0;

  const estimatedCostMonth = jobs
    .filter((job) => inRange(job.created_at, startMonth))
    .reduce((acc, job) => {
      const template = templates.find((tpl) => tpl.id === job.template_id);
      return acc + providerCostByTier(template?.content_tier ?? "standard");
    }, 0);

  return {
    totalAthletes: athletes.length,
    videosToday,
    videosWeek,
    videosMonth,
    approvalRate: jobs.length ? (approved / jobs.length) * 100 : 0,
    avgFaceScore,
    estimatedCostMonth,
  };
}

function groupTemplates(templates: Template[]) {
  return templates.reduce<Record<string, Template[]>>((acc, template) => {
    acc[template.category] = acc[template.category] ? [...acc[template.category], template] : [template];
    return acc;
  }, {});
}

export async function ensureTemplatesSeeded() {
  const memory = getMemoryStore();
  if (!supabaseAdmin) return;

  try {
    const { count, error: countError } = await supabaseAdmin
      .from("templates")
      .select("id", { count: "exact", head: true });
    if (countError) throw countError;
    if ((count ?? 0) > 0) return;

    const payload = TEMPLATE_SEED_DATA.map((template) => ({
      ...template,
      target_platforms: template.target_platforms,
    }));
    const { error: insertError } = await supabaseAdmin.from("templates").insert(payload);
    if (insertError) throw insertError;
  } catch {
    // Keep development flow working even if DB/migrations are not configured yet.
    memory.templates = memory.templates.length ? memory.templates : memory.templates;
  }
}

export async function listAthletes() {
  const memory = getMemoryStore();
  if (!supabaseAdmin) return sortByCreatedDesc(memory.athletes);
  try {
    const { data, error } = await supabaseAdmin.from("athletes").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as Athlete[];
  } catch {
    return sortByCreatedDesc(memory.athletes);
  }
}

export async function getAthleteById(id: string) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) return memory.athletes.find((athlete) => athlete.id === id) ?? null;
  try {
    const { data, error } = await supabaseAdmin.from("athletes").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Athlete;
  } catch {
    return memory.athletes.find((athlete) => athlete.id === id) ?? null;
  }
}

export async function createAthlete(input: AthleteInput) {
  const memory = getMemoryStore();
  const row: Athlete = { ...input, id: crypto.randomUUID(), created_at: nowIso(), updated_at: nowIso() };
  if (!supabaseAdmin) {
    memory.athletes.unshift(row);
    return row;
  }
  try {
    const { data, error } = await supabaseAdmin.from("athletes").insert(input).select("*").single();
    if (error) throw error;
    return data as Athlete;
  } catch {
    memory.athletes.unshift(row);
    return row;
  }
}

export async function updateAthlete(id: string, input: Partial<AthleteInput>) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) {
    memory.athletes = memory.athletes.map((athlete) =>
      athlete.id === id ? { ...athlete, ...input, updated_at: nowIso() } : athlete,
    );
    return memory.athletes.find((athlete) => athlete.id === id) ?? null;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("athletes")
      .update({ ...input, updated_at: nowIso() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Athlete;
  } catch {
    memory.athletes = memory.athletes.map((athlete) =>
      athlete.id === id ? { ...athlete, ...input, updated_at: nowIso() } : athlete,
    );
    return memory.athletes.find((athlete) => athlete.id === id) ?? null;
  }
}

export async function deleteAthlete(id: string) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) {
    memory.athletes = memory.athletes.filter((athlete) => athlete.id !== id);
    return;
  }
  try {
    const { error } = await supabaseAdmin.from("athletes").delete().eq("id", id);
    if (error) throw error;
  } catch {
    memory.athletes = memory.athletes.filter((athlete) => athlete.id !== id);
  }
}

export async function listTemplates() {
  await ensureTemplatesSeeded();
  const memory = getMemoryStore();
  if (!supabaseAdmin) return memory.templates;
  try {
    const { data, error } = await supabaseAdmin.from("templates").select("*").order("category");
    if (error) throw error;
    return (data ?? []) as Template[];
  } catch {
    return memory.templates;
  }
}

export async function listTemplatesGrouped() {
  const templates = await listTemplates();
  return groupTemplates(templates);
}

export async function getTemplateById(id: string) {
  const templates = await listTemplates();
  return templates.find((template) => template.id === id) ?? null;
}

export async function createTemplate(input: TemplateInput) {
  const memory = getMemoryStore();
  const row: Template = { ...input, id: crypto.randomUUID(), created_at: nowIso(), updated_at: nowIso() };
  if (!supabaseAdmin) {
    memory.templates.push(row);
    return row;
  }
  try {
    const { data, error } = await supabaseAdmin.from("templates").insert(input).select("*").single();
    if (error) throw error;
    return data as Template;
  } catch {
    memory.templates.push(row);
    return row;
  }
}

export async function updateTemplate(id: string, input: Partial<TemplateInput>) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) {
    memory.templates = memory.templates.map((template) =>
      template.id === id ? { ...template, ...input, updated_at: nowIso() } : template,
    );
    return memory.templates.find((template) => template.id === id) ?? null;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("templates")
      .update({ ...input, updated_at: nowIso() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Template;
  } catch {
    memory.templates = memory.templates.map((template) =>
      template.id === id ? { ...template, ...input, updated_at: nowIso() } : template,
    );
    return memory.templates.find((template) => template.id === id) ?? null;
  }
}

export async function deleteTemplate(id: string) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) {
    memory.templates = memory.templates.filter((template) => template.id !== id);
    return;
  }
  try {
    const { error } = await supabaseAdmin.from("templates").delete().eq("id", id);
    if (error) throw error;
  } catch {
    memory.templates = memory.templates.filter((template) => template.id !== id);
  }
}

export async function listJobs(status?: JobStatus) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) {
    const jobs = status ? memory.jobs.filter((job) => job.status === status) : memory.jobs;
    return sortByCreatedDesc(jobs);
  }
  try {
    let query = supabaseAdmin.from("jobs").select("*").order("created_at", { ascending: false });
    if (status) {
      query = query.eq("status", status);
    }
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []) as Job[];
  } catch {
    const jobs = status ? memory.jobs.filter((job) => job.status === status) : memory.jobs;
    return sortByCreatedDesc(jobs);
  }
}

export async function getJobById(id: string) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) return memory.jobs.find((job) => job.id === id) ?? null;
  try {
    const { data, error } = await supabaseAdmin.from("jobs").select("*").eq("id", id).single();
    if (error) throw error;
    return data as Job;
  } catch {
    return memory.jobs.find((job) => job.id === id) ?? null;
  }
}

export async function createJob(input: JobInput) {
  const memory = getMemoryStore();
  const row: Job = { ...input, id: crypto.randomUUID(), created_at: nowIso(), updated_at: nowIso() };
  if (!supabaseAdmin) {
    memory.jobs.unshift(row);
    return row;
  }
  try {
    const { data, error } = await supabaseAdmin.from("jobs").insert(input).select("*").single();
    if (error) throw error;
    return data as Job;
  } catch {
    memory.jobs.unshift(row);
    return row;
  }
}

export async function updateJob(id: string, input: Partial<JobInput>) {
  const memory = getMemoryStore();
  if (!supabaseAdmin) {
    memory.jobs = memory.jobs.map((job) => (job.id === id ? { ...job, ...input, updated_at: nowIso() } : job));
    return memory.jobs.find((job) => job.id === id) ?? null;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("jobs")
      .update({ ...input, updated_at: nowIso() })
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Job;
  } catch {
    memory.jobs = memory.jobs.map((job) => (job.id === id ? { ...job, ...input, updated_at: nowIso() } : job));
    return memory.jobs.find((job) => job.id === id) ?? null;
  }
}

export async function getSettings() {
  const memory = getMemoryStore();
  if (!supabaseAdmin) return memory.settings;
  try {
    const { data, error } = await supabaseAdmin.from("settings").select("*").eq("id", 1).single();
    if (error) throw error;
    return data as Settings;
  } catch {
    return memory.settings;
  }
}

export async function updateSettings(input: Partial<Settings>) {
  const memory = getMemoryStore();
  const payload = { ...input, updated_at: nowIso() };
  if (!supabaseAdmin) {
    memory.settings = { ...memory.settings, ...payload };
    return memory.settings;
  }
  try {
    const { data, error } = await supabaseAdmin
      .from("settings")
      .upsert({ id: 1, ...payload })
      .select("*")
      .single();
    if (error) throw error;
    return data as Settings;
  } catch {
    memory.settings = { ...memory.settings, ...payload };
    return memory.settings;
  }
}

export async function getDashboardStats() {
  const [athletes, jobs, templates] = await Promise.all([listAthletes(), listJobs(), listTemplates()]);
  return calculateStats(athletes, jobs, templates);
}
