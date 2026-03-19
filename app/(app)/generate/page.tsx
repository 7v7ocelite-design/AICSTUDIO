"use client";

import { TierBadge } from "@/components/ui/tier-badge";
import { Athlete, Template } from "@/lib/types";
import { makeVideoFileName } from "@/lib/utils";
import { Bot, Sparkles } from "lucide-react";
import { ReactNode, useMemo, useState, useEffect } from "react";
import { toast } from "sonner";

interface ProgressEvent {
  event: string;
  data: Record<string, unknown>;
}

const tierCost: Record<Template["content_tier"], number> = {
  standard: 0.08,
  premium: 0.25,
  social: 0.12,
};

export default function GeneratePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [athleteId, setAthleteId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [progress, setProgress] = useState<ProgressEvent[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [score, setScore] = useState<number | null>(null);
  const [finalStatus, setFinalStatus] = useState<string>("");
  const [jobId, setJobId] = useState<string>("");

  useEffect(() => {
    void (async () => {
      try {
        setLoading(true);
        const [athletesRes, templatesRes] = await Promise.all([fetch("/api/athletes"), fetch("/api/templates")]);
        const athletesJson = (await athletesRes.json()) as { athletes: Athlete[] };
        const templatesJson = (await templatesRes.json()) as { templates: Template[] };
        setAthletes(athletesJson.athletes ?? []);
        setTemplates(templatesJson.templates ?? []);
      } catch {
        toast.error("Failed to load generate page data");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const groupedTemplates = useMemo(
    () =>
      templates.reduce<Record<string, Template[]>>((acc, template) => {
        acc[template.category] = acc[template.category] ? [...acc[template.category], template] : [template];
        return acc;
      }, {}),
    [templates],
  );

  const selectedAthlete = athletes.find((athlete) => athlete.id === athleteId);
  const selectedTemplate = templates.find((template) => template.id === templateId);

  const assembledPrompt =
    selectedAthlete && selectedTemplate
      ? `${selectedAthlete.descriptor} ${selectedTemplate.action} in ${selectedTemplate.location}, wearing ${selectedTemplate.wardrobe}. ${selectedTemplate.lighting}. ${selectedTemplate.camera_angle}. Cinematic quality, photorealistic, 4K. No skeletal distortion, no extra limbs, no text overlays.`
      : "";

  const fileNamePreview =
    selectedAthlete && selectedTemplate
      ? makeVideoFileName({
          athleteName: selectedAthlete.name,
          category: selectedTemplate.category,
          location: selectedTemplate.location,
        })
      : "";

  const engine =
    selectedTemplate?.content_tier === "premium"
      ? "Runway Gen-4.5"
      : selectedTemplate?.content_tier === "social"
        ? "Vidu Q3 Pro"
        : "Kling 3.0";

  async function handleGenerate() {
    if (!athleteId || !templateId) {
      toast.error("Choose an athlete and template first");
      return;
    }

    setIsGenerating(true);
    setProgress([]);
    setVideoUrl(null);
    setScore(null);
    setFinalStatus("");
    setJobId("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ athlete_id: athleteId, template_id: templateId }),
      });
      if (!response.ok || !response.body) {
        throw new Error("Failed to start generation");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const chunks = buffer.split("\n\n");
        buffer = chunks.pop() ?? "";

        for (const chunk of chunks) {
          if (!chunk.trim()) continue;
          const lines = chunk.split("\n");
          const eventLine = lines.find((line) => line.startsWith("event:"));
          const dataLine = lines.find((line) => line.startsWith("data:"));
          if (!eventLine || !dataLine) continue;
          const event = eventLine.replace("event:", "").trim();
          const data = JSON.parse(dataLine.replace("data:", "").trim()) as Record<string, unknown>;
          setProgress((prev) => [...prev, { event, data }]);

          if (event === "job_created") {
            setJobId(String(data.job_id ?? ""));
          }
          if (event === "face_score") {
            setScore(Number(data.score ?? 0));
          }
          if (event === "complete") {
            setVideoUrl(String(data.video_url ?? ""));
            setFinalStatus(String(data.status ?? ""));
            toast.success("Video pipeline complete");
          }
          if (event === "error") {
            toast.error(String(data.message ?? "Generation failed"));
          }
        }
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-[#2E75B6]/50 bg-gradient-to-r from-[#1E293B] to-[#15243f] p-5">
        <div className="flex items-center gap-2">
          <Sparkles className="text-[#7ab8ed]" size={18} />
          <h1 className="text-2xl font-bold">Generate</h1>
        </div>
        <p className="mt-2 text-sm text-slate-300">
          Control center for premium AI video generation with prompt QA, engine routing, and auto-approval.
        </p>
      </div>

      <section className="card p-4 space-y-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-slate-300">Select Athlete</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-900/70 p-2.5"
              value={athleteId}
              onChange={(event) => setAthleteId(event.target.value)}
              disabled={loading}
            >
              <option value="">Choose athlete</option>
              {athletes.map((athlete) => (
                <option key={athlete.id} value={athlete.id}>
                  {athlete.name} · {athlete.position} · {athlete.state}
                </option>
              ))}
            </select>
            {selectedAthlete ? (
              <div className="mt-2 flex items-center gap-3 rounded-lg border border-slate-700 bg-slate-900/50 p-2">
                {selectedAthlete.reference_photo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selectedAthlete.reference_photo_url}
                    alt={selectedAthlete.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-slate-700" />
                )}
                <div>
                  <p className="text-sm font-medium">{selectedAthlete.name}</p>
                  <p className="text-xs text-slate-400">{selectedAthlete.position}</p>
                </div>
              </div>
            ) : null}
          </div>
          <div>
            <label className="mb-1 block text-sm text-slate-300">Select Template</label>
            <select
              className="w-full rounded-lg border border-slate-600 bg-slate-900/70 p-2.5"
              value={templateId}
              onChange={(event) => setTemplateId(event.target.value)}
              disabled={loading}
            >
              <option value="">Choose template</option>
              {Object.entries(groupedTemplates).map(([category, items]) => (
                <optgroup key={category} label={category}>
                  {items.map((template) => (
                    <option key={template.id} value={template.id}>
                      {category} {">"} {template.variant} ({template.content_tier})
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {selectedAthlete && selectedTemplate ? (
          <div className="space-y-4 rounded-xl border border-slate-700 bg-slate-900/40 p-4">
            <div>
              <p className="text-xs uppercase tracking-wide text-slate-400">Assembled Prompt</p>
              <p className="mt-2 rounded-lg border border-slate-700 bg-[#101b31] p-3 text-sm text-slate-200">
                {assembledPrompt}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <TierBadge tier={selectedTemplate.content_tier} />
              <Chip>{engine}</Chip>
              <Chip>{selectedTemplate.target_platforms.join(", ")}</Chip>
              <Chip>${tierCost[selectedTemplate.content_tier].toFixed(2)} est.</Chip>
            </div>
            <p className="text-sm text-slate-300">
              <span className="text-slate-400">Output file:</span> {fileNamePreview}
            </p>
          </div>
        ) : null}

        <button
          className="w-full rounded-xl bg-[#2E75B6] px-4 py-3 text-base font-semibold text-white transition hover:bg-[#3a84c6] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleGenerate}
          disabled={isGenerating || !selectedAthlete || !selectedTemplate}
        >
          {isGenerating ? "Generating..." : "GENERATE VIDEO"}
        </button>

        {progress.length ? (
          <div className="rounded-xl border border-slate-700 bg-slate-900/50 p-4">
            <p className="mb-3 text-sm font-semibold">Pipeline Progress</p>
            <ul className="space-y-2 text-sm">
              {progress.map((item, index) => (
                <li key={`${item.event}-${index}`} className="flex items-start gap-2">
                  <Bot size={14} className="mt-0.5 text-[#7ab8ed]" />
                  <span>{eventLabel(item.event, item.data)}</span>
                </li>
              ))}
            </ul>
            {videoUrl ? (
              <div className="mt-4 space-y-3 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                <video controls className="w-full rounded-md" src={videoUrl} />
                <div className="flex flex-wrap gap-2">
                  <a
                    href={videoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="rounded-md bg-[#2E75B6] px-3 py-2 text-xs font-semibold"
                  >
                    ▶ Play Video
                  </a>
                  <a
                    href={videoUrl}
                    download
                    className="rounded-md border border-slate-600 px-3 py-2 text-xs font-semibold"
                  >
                    ⬇ Download
                  </a>
                </div>
                <p className="text-xs text-slate-400">
                  Job ID: {jobId || "-"} · Status: {finalStatus || "-"} · Face Score:{" "}
                  {score ? `${score.toFixed(1)}%` : "-"}
                </p>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>
    </div>
  );
}

function Chip({ children }: { children: ReactNode }) {
  return <span className="rounded-full border border-slate-600/70 px-2 py-1 text-xs text-slate-200">{children}</span>;
}

function eventLabel(event: string, data: Record<string, unknown>) {
  switch (event) {
    case "prompt_assembled":
      return "✅ Prompt assembled";
    case "claude_validated":
      return "✅ Claude AI validated prompt";
    case "generating":
      return `⏳ Generating video via ${String(data.engine ?? "engine")}...`;
    case "scoring":
      return "⏳ Scoring face similarity...";
    case "face_score":
      return `✅ Face score: ${Number(data.score ?? 0).toFixed(1)}%`;
    case "retrying":
      return `🔄 Score below threshold, regenerating (attempt ${String(data.attempt ?? "?")})`;
    case "complete":
      return `✅ Video ready (${String(data.status ?? "done")})`;
    case "error":
      return `❌ ${String(data.message ?? "Generation failed")}`;
    default:
      return `${event}`;
  }
}
