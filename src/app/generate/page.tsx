"use client";

import { useState, useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { getTierBadge } from "@/lib/utils";
import type { Athlete, Template } from "@/lib/types";
import { TIER_ENGINES } from "@/lib/types";
import {
  Sparkles,
  Play,
  CheckCircle,
  AlertCircle,
  Loader2,
  Film,
  Zap,
  Eye,
  Volume2,
  Camera,
  Sun,
  Shirt,
  MapPin,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

interface ProgressStep {
  id: string;
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

export default function GeneratePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    fileName?: string;
    outputUrl?: string;
    faceScore?: number;
    status?: string;
    engine?: string;
  } | null>(null);
  const [steps, setSteps] = useState<ProgressStep[]>([]);
  const progressRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function load() {
      const [aRes, tRes] = await Promise.all([
        fetch("/api/athletes"),
        fetch("/api/templates"),
      ]);
      if (aRes.ok) {
        const data = await aRes.json();
        setAthletes(data.athletes || []);
      }
      if (tRes.ok) {
        const data = await tRes.json();
        setTemplates(data.templates || []);
      }
    }
    load();
  }, []);

  const selectedTemplateData = templates.find(
    (t) => t.id === selectedTemplate
  );
  // Used for prompt preview in future iterations
  void athletes.find((a) => a.id === selectedAthlete);

  async function handleGenerate() {
    if (!selectedAthlete || !selectedTemplate) {
      toast.error("Please select an athlete and template");
      return;
    }

    setGenerating(true);
    setResult(null);
    setSteps([
      { id: "prompt", label: "Assembling prompt", status: "pending" },
      { id: "validate", label: "AI validation", status: "pending" },
      { id: "generate", label: "Generating video", status: "pending" },
      { id: "score", label: "Face scoring", status: "pending" },
      { id: "route", label: "Quality routing", status: "pending" },
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
      const decoder = new TextDecoder();

      if (!reader) throw new Error("No response stream");

      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === "step") {
                setSteps((prev) =>
                  prev.map((s) =>
                    s.id === data.step
                      ? { ...s, status: data.status, detail: data.detail }
                      : s
                  )
                );
              } else if (data.type === "result") {
                setResult(data);
                if (data.success) {
                  toast.success(
                    `Video generated! Score: ${data.faceScore}/100`
                  );
                } else {
                  toast.error("Generation failed");
                }
              }
            } catch {
              // skip malformed SSE
            }
          }
        }
      }
    } catch {
      toast.error("Generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand-accent to-purple-600 shadow-lg shadow-brand-accent/20">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Generate Content</h1>
            <p className="text-sm text-gray-400">
              AI-powered video production pipeline
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: Configuration */}
        <div className="space-y-6 lg:col-span-2">
          {/* Athlete + Template Selection */}
          <Card className="overflow-hidden border-brand-accent/20">
            <div className="border-b border-white/5 bg-gradient-to-r from-brand-accent/5 to-transparent px-6 py-4">
              <h2 className="text-base font-semibold text-white">
                Production Setup
              </h2>
              <p className="mt-0.5 text-xs text-gray-400">
                Select athlete and template to begin
              </p>
            </div>
            <div className="space-y-6 p-6">
              <Select
                label="Athlete"
                value={selectedAthlete}
                onChange={(e) => setSelectedAthlete(e.target.value)}
                options={[
                  { value: "", label: "Select an athlete..." },
                  ...athletes.map((a) => ({
                    value: a.id,
                    label: `${a.name} — ${a.sport}`,
                  })),
                ]}
              />

              <div>
                <label className="mb-1.5 block text-sm font-medium text-gray-300">
                  Template
                </label>
                <div className="relative">
                  <select
                    value={selectedTemplate}
                    onChange={(e) => setSelectedTemplate(e.target.value)}
                    className="w-full appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white focus:border-brand-accent focus:outline-none focus:ring-1 focus:ring-brand-accent transition-colors"
                  >
                    <option value="" className="bg-brand-card">
                      Select a template...
                    </option>
                    {Array.from(new Set(templates.map((t) => t.category))).map(
                      (cat) => (
                        <optgroup key={cat} label={cat} className="bg-brand-card">
                          {templates
                            .filter((t) => t.category === cat)
                            .map((t) => (
                              <option
                                key={t.id}
                                value={t.id}
                                className="bg-brand-card"
                              >
                                {t.variant_name} — {t.action}
                              </option>
                            ))}
                        </optgroup>
                      )
                    )}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
                </div>
              </div>
            </div>
          </Card>

          {/* Template Preview */}
          {selectedTemplateData && (
            <Card className="animate-in fade-in duration-300">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-white">
                  Template Details
                </h3>
                <Badge className={getTierBadge(selectedTemplateData.content_tier)}>
                  {selectedTemplateData.content_tier}
                </Badge>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  { icon: Play, label: "Action", value: selectedTemplateData.action },
                  { icon: MapPin, label: "Location", value: selectedTemplateData.location },
                  { icon: Shirt, label: "Wardrobe", value: selectedTemplateData.wardrobe },
                  { icon: Sun, label: "Lighting", value: selectedTemplateData.lighting },
                  { icon: Camera, label: "Camera", value: selectedTemplateData.camera_angle },
                  { icon: Volume2, label: "Audio", value: selectedTemplateData.audio_track },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start gap-3 rounded-lg bg-white/[0.03] p-3"
                  >
                    <item.icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-brand-accent" />
                    <div>
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className="text-sm text-gray-200">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-accent/5 p-3">
                <Zap className="h-4 w-4 text-brand-accent" />
                <span className="text-xs text-gray-400">
                  Engine:{" "}
                  <span className="font-medium text-brand-accent">
                    {TIER_ENGINES[selectedTemplateData.content_tier]}
                  </span>
                </span>
              </div>
            </Card>
          )}

          {/* Generate Button */}
          <Button
            size="lg"
            onClick={handleGenerate}
            loading={generating}
            disabled={!selectedAthlete || !selectedTemplate}
            className="w-full bg-gradient-to-r from-brand-accent to-blue-600 py-4 text-base shadow-xl shadow-brand-accent/25 hover:shadow-brand-accent/40 transition-all"
          >
            {generating ? (
              "Generating..."
            ) : (
              <>
                <Sparkles className="h-5 w-5" />
                Generate Video
              </>
            )}
          </Button>
        </div>

        {/* Right column: Progress & Result */}
        <div className="space-y-6" ref={progressRef}>
          {/* Progress Tracker */}
          {steps.length > 0 && (
            <Card className="border-brand-accent/10">
              <h3 className="mb-4 text-base font-semibold text-white">
                Pipeline Progress
              </h3>
              <div className="space-y-1">
                {steps.map((step, i) => (
                  <div key={step.id} className="flex items-start gap-3 py-2">
                    <div className="flex flex-col items-center">
                      {step.status === "done" ? (
                        <CheckCircle className="h-5 w-5 text-emerald-400" />
                      ) : step.status === "active" ? (
                        <Loader2 className="h-5 w-5 animate-spin text-brand-accent" />
                      ) : step.status === "error" ? (
                        <AlertCircle className="h-5 w-5 text-red-400" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-600" />
                      )}
                      {i < steps.length - 1 && (
                        <div
                          className={`mt-1 h-6 w-0.5 ${
                            step.status === "done"
                              ? "bg-emerald-400/50"
                              : "bg-gray-700"
                          }`}
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium ${
                          step.status === "done"
                            ? "text-emerald-400"
                            : step.status === "active"
                              ? "text-brand-accent"
                              : step.status === "error"
                                ? "text-red-400"
                                : "text-gray-500"
                        }`}
                      >
                        {step.label}
                      </p>
                      {step.detail && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {step.detail}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Result Card */}
          {result && (
            <Card
              className={`border ${
                result.success
                  ? "border-emerald-500/20 bg-emerald-500/5"
                  : "border-red-500/20 bg-red-500/5"
              }`}
            >
              <div className="flex items-center gap-3 mb-4">
                {result.success ? (
                  <CheckCircle className="h-6 w-6 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-6 w-6 text-red-400" />
                )}
                <h3 className="text-base font-semibold text-white">
                  {result.success ? "Generation Complete" : "Generation Failed"}
                </h3>
              </div>

              {result.success && (
                <div className="space-y-3">
                  <div className="aspect-video rounded-lg bg-black/40 flex items-center justify-center border border-white/5 overflow-hidden relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-brand-accent/10 to-purple-600/10" />
                    <div className="relative flex flex-col items-center gap-2">
                      <Film className="h-10 w-10 text-gray-500" />
                      <p className="text-xs text-gray-500">
                        Video Preview
                      </p>
                    </div>
                    <button className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors">
                      <Play className="h-12 w-12 text-white/0 group-hover:text-white/80 transition-colors" />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">File</span>
                      <span className="text-white truncate ml-2 max-w-[180px]">
                        {result.fileName}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Face Score</span>
                      <span
                        className={`font-semibold ${
                          (result.faceScore || 0) >= 90
                            ? "text-emerald-400"
                            : "text-orange-400"
                        }`}
                      >
                        {result.faceScore}/100
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Status</span>
                      <Badge
                        className={
                          result.status === "approved"
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-orange-500/20 text-orange-400"
                        }
                      >
                        {result.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-400">Engine</span>
                      <span className="text-gray-300">{result.engine}</span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* Empty state for right column */}
          {steps.length === 0 && !result && (
            <Card className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 rounded-full bg-brand-accent/10 p-4">
                <Eye className="h-8 w-8 text-brand-accent/50" />
              </div>
              <p className="text-sm font-medium text-gray-400">
                Pipeline Preview
              </p>
              <p className="mt-1 max-w-[200px] text-xs text-gray-500">
                Select an athlete and template, then hit Generate to see the
                pipeline in action
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
