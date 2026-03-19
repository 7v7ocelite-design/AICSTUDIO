"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Zap,
  Loader2,
  CheckCircle,
  Clock,
  Download,
  Play,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import type { Athlete, Template, ContentTier } from "@/lib/database.types";

type ProgressStep = {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
};

const tierConfig: Record<ContentTier, { label: string; color: string; dot: string; engine: string }> = {
  premium: { label: "Premium", color: "text-yellow-400", dot: "bg-yellow-400", engine: "Runway Gen-4.5" },
  standard: { label: "Standard", color: "text-green-400", dot: "bg-green-400", engine: "Kling 3.0" },
  social: { label: "Social", color: "text-blue-400", dot: "bg-blue-400", engine: "Vidu Q3 Pro" },
};

const costEstimates: Record<ContentTier, number> = { premium: 0.50, standard: 0.25, social: 0.15 };

export default function GeneratePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [grouped, setGrouped] = useState<Record<string, Template[]>>({});
  const [selectedAthlete, setSelectedAthlete] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const [result, setResult] = useState<{
    videoUrl: string;
    score: number;
    status: string;
    fileName: string;
    engine: string;
  } | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/athletes").then((r) => r.json()),
      fetch("/api/templates").then((r) => r.json()),
    ]).then(([a, t]) => {
      setAthletes(Array.isArray(a) ? a : []);
      setTemplates(t.templates || []);
      setGrouped(t.grouped || {});
    });
  }, []);

  const athlete = athletes.find((a) => a.id === selectedAthlete);
  const template = templates.find((t) => t.id === selectedTemplate);

  const assembledPrompt =
    athlete && template
      ? `${athlete.descriptor} ${template.action} in ${template.location}, wearing ${template.wardrobe}. ${template.lighting}. ${template.camera_angle}. Cinematic quality, photorealistic, 4K. No skeletal distortion, no extra limbs, no text overlays.`
      : "";

  const tier = template?.content_tier as ContentTier | undefined;
  const config = tier ? tierConfig[tier] : null;

  const generateFileName = useCallback(() => {
    if (!athlete || !template) return "";
    const clean = (s: string) => s.replace(/[^a-zA-Z0-9]/g, "");
    const d = new Date().toISOString().split("T")[0];
    return `${clean(athlete.name)}_${clean(template.category)}_${clean(template.location)}_V01_${d}.mp4`;
  }, [athlete, template]);

  const handleGenerate = async () => {
    if (!selectedAthlete || !selectedTemplate) {
      toast.error("Please select an athlete and template");
      return;
    }

    setGenerating(true);
    setResult(null);
    setSteps([
      { id: "prompt", label: "Prompt assembled", status: "active" },
      { id: "claude", label: "Claude AI validated prompt", status: "pending" },
      { id: "generating", label: `Generating video via ${config?.engine}...`, status: "pending" },
      { id: "scoring", label: "Scoring face similarity...", status: "pending" },
      { id: "complete", label: "Processing...", status: "pending" },
    ]);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          athlete_id: selectedAthlete,
          template_id: selectedTemplate,
        }),
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = JSON.parse(line.slice(6));

          switch (data.event) {
            case "prompt_assembled":
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === "prompt"
                    ? { ...s, status: "done" }
                    : s.id === "claude"
                    ? { ...s, status: "active" }
                    : s
                )
              );
              break;
            case "claude_validated":
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === "claude"
                    ? { ...s, status: "done" }
                    : s.id === "generating"
                    ? { ...s, status: "active" }
                    : s
                )
              );
              break;
            case "generating":
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === "generating"
                    ? { ...s, status: "active", label: `Generating video via ${data.engine}...` }
                    : s
                )
              );
              break;
            case "scoring":
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === "generating"
                    ? { ...s, status: "done" }
                    : s.id === "scoring"
                    ? { ...s, status: "active" }
                    : s
                )
              );
              break;
            case "retrying":
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === "scoring"
                    ? {
                        ...s,
                        status: "active",
                        label: `Score ${data.score}% — Retrying (${data.retry}/${data.maxRetries})...`,
                      }
                    : s
                )
              );
              break;
            case "complete": {
              const statusLabel =
                data.status === "approved"
                  ? `Face score: ${data.score}% — Auto-approved!`
                  : data.status === "needs_review"
                  ? `Face score: ${data.score}% — Needs review`
                  : `Face score: ${data.score}% — Rejected`;
              setSteps((prev) =>
                prev.map((s) =>
                  s.id === "scoring"
                    ? { ...s, status: "done", label: statusLabel }
                    : s.id === "complete"
                    ? { ...s, status: "done", label: "Video ready" }
                    : s
                )
              );
              setResult({
                videoUrl: data.video_url,
                score: data.score,
                status: data.status,
                fileName: data.file_name,
                engine: data.engine,
              });
              toast.success("Video generation complete!");
              break;
            }
            case "error":
              toast.error(data.message || "Generation failed");
              setSteps((prev) =>
                prev.map((s) =>
                  s.status === "active"
                    ? { ...s, status: "error", label: `Error: ${data.message}` }
                    : s
                )
              );
              break;
          }
        }
      }
    } catch (err) {
      toast.error("Generation failed");
      console.error(err);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 bg-brand-accent/20 rounded-lg">
          <Zap className="text-brand-accent-hover" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Generate Video</h1>
          <p className="text-sm text-gray-400">
            AI-powered video generation for athletes
          </p>
        </div>
      </div>

      {/* Athlete Selection */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Athlete
          </label>
          <select
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value)}
            className="w-full bg-brand-card border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors"
          >
            <option value="">Choose an athlete...</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} — {a.position} — {a.state}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Select Template
          </label>
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="w-full bg-brand-card border border-white/10 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-brand-accent transition-colors"
          >
            <option value="">Choose a template...</option>
            {Object.entries(grouped).map(([category, items]) => (
              <optgroup key={category} label={category}>
                {items.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.variant} ({t.content_tier})
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
      </div>

      {/* Prompt Preview */}
      {athlete && template && (
        <div className="space-y-4 mb-6">
          <div className="bg-brand-card rounded-xl border border-white/5 p-6">
            <h3 className="text-sm font-medium text-gray-400 mb-3">
              Assembled Prompt
            </h3>
            <p className="text-sm text-gray-200 leading-relaxed bg-black/20 rounded-lg p-4 font-mono">
              {assembledPrompt}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {config && (
              <>
                <span
                  className={`inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full bg-white/5 ${config.color}`}
                >
                  <span className={`w-2 h-2 rounded-full ${config.dot}`} />
                  {config.label}
                </span>
                <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-gray-300">
                  {config.engine}
                </span>
              </>
            )}
            <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-gray-300">
              {template.platforms}
            </span>
            {tier && (
              <span className="text-xs px-3 py-1.5 rounded-full bg-white/5 text-green-400">
                ~${costEstimates[tier].toFixed(2)}
              </span>
            )}
          </div>

          <div className="text-xs text-gray-500">
            File: <span className="text-gray-400 font-mono">{generateFileName()}</span>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button
        onClick={handleGenerate}
        disabled={generating || !selectedAthlete || !selectedTemplate}
        className={`w-full py-4 rounded-xl font-semibold text-lg transition-all flex items-center justify-center gap-2 ${
          generating || !selectedAthlete || !selectedTemplate
            ? "bg-brand-accent/30 text-gray-400 cursor-not-allowed"
            : "bg-brand-accent hover:bg-brand-accent-hover text-white shadow-lg shadow-brand-accent/25 hover:shadow-brand-accent/40"
        }`}
      >
        {generating ? (
          <>
            <Loader2 className="animate-spin" size={20} />
            Generating...
          </>
        ) : (
          <>
            <Zap size={20} />
            GENERATE VIDEO
          </>
        )}
      </button>

      {/* Progress Steps */}
      {steps.length > 0 && (
        <div className="mt-6 bg-brand-card rounded-xl border border-white/5 p-6 space-y-3">
          {steps.map((step) => (
            <div key={step.id} className="flex items-center gap-3">
              {step.status === "done" ? (
                <CheckCircle size={18} className="text-green-400 shrink-0" />
              ) : step.status === "active" ? (
                <Loader2 size={18} className="text-brand-accent-hover animate-spin shrink-0" />
              ) : step.status === "error" ? (
                <AlertCircle size={18} className="text-red-400 shrink-0" />
              ) : (
                <Clock size={18} className="text-gray-600 shrink-0" />
              )}
              <span
                className={`text-sm ${
                  step.status === "done"
                    ? "text-green-400"
                    : step.status === "active"
                    ? "text-white"
                    : step.status === "error"
                    ? "text-red-400"
                    : "text-gray-500"
                }`}
              >
                {step.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 bg-brand-card rounded-xl border border-white/5 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Video Ready</h3>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${
                result.status === "approved"
                  ? "bg-green-500/20 text-green-400"
                  : result.status === "needs_review"
                  ? "bg-yellow-500/20 text-yellow-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {result.status.replace("_", " ")}
            </span>
          </div>

          <div className="bg-black/30 rounded-lg aspect-video flex items-center justify-center mb-4">
            <div className="text-center text-gray-400">
              <Play size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Video Preview</p>
              <p className="text-xs text-gray-500 mt-1">(Simulated — connect API for real video)</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button className="flex items-center gap-2 px-4 py-2 bg-brand-accent hover:bg-brand-accent-hover rounded-lg text-sm font-medium transition-colors">
              <Play size={16} />
              Play Video
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors">
              <Download size={16} />
              Download
            </button>
            <button
              onClick={() => {
                setResult(null);
                setSteps([]);
              }}
              className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw size={16} />
              Generate Another
            </button>
          </div>

          <div className="mt-4 text-xs text-gray-500 space-y-1">
            <p>File: <span className="text-gray-400 font-mono">{result.fileName}</span></p>
            <p>Engine: {result.engine}</p>
            <p>Face Score: <span className={result.score >= 90 ? "text-green-400" : "text-yellow-400"}>{result.score}%</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
