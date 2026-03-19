"use client";

import { useMemo, useState, useEffect } from "react";
import { PlayCircle, Sparkles, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/page-header";
import { ProgressTracker } from "@/components/progress-tracker";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import type { Athlete, PipelineProgressEvent, Template } from "@/lib/types";

interface GenerateResult {
  filename?: string;
  videoUrl?: string;
}

export default function GeneratePage() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [athleteId, setAthleteId] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [customDirection, setCustomDirection] = useState("");
  const [events, setEvents] = useState<PipelineProgressEvent[]>([]);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<GenerateResult | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [athletesResponse, templatesResponse] = await Promise.all([
          fetch("/api/athletes", { cache: "no-store" }),
          fetch("/api/templates", { cache: "no-store" })
        ]);

        const athletesPayload = (await athletesResponse.json()) as { athletes: Athlete[] };
        const templatesPayload = (await templatesResponse.json()) as { templates: Template[] };

        setAthletes(athletesPayload.athletes ?? []);
        setTemplates(templatesPayload.templates ?? []);
        setAthleteId(athletesPayload.athletes?.[0]?.id ?? "");
        setTemplateId(templatesPayload.templates?.[0]?.id ?? "");
      } catch {
        toast.error("Failed to load generation inputs.");
      } finally {
        setIsLoadingData(false);
      }
    };

    void load();
  }, []);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.id === templateId),
    [templates, templateId]
  );

  const selectedAthlete = useMemo(
    () => athletes.find((athlete) => athlete.id === athleteId),
    [athletes, athleteId]
  );

  const canGenerate = Boolean(athleteId && templateId && !isGenerating);

  const handleGenerate = async () => {
    if (!canGenerate) {
      return;
    }

    setResult(null);
    setEvents([]);
    setIsGenerating(true);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          athleteId,
          templateId,
          customDirection
        })
      });

      if (!response.ok || !response.body) {
        throw new Error("Unable to start generation stream.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffered = "";
      let latestResult: GenerateResult | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }

        buffered += decoder.decode(value, { stream: true });
        const chunks = buffered.split("\n\n");
        buffered = chunks.pop() ?? "";

        for (const chunk of chunks) {
          const dataLine = chunk
            .split("\n")
            .find((line) => line.startsWith("data: "))
            ?.replace("data: ", "")
            .trim();

          if (!dataLine) {
            continue;
          }

          try {
            const event = JSON.parse(dataLine) as PipelineProgressEvent;
            setEvents((prev) => [...prev, event]);
            if (event.videoUrl || event.filename) {
              latestResult = {
                filename: event.filename,
                videoUrl: event.videoUrl
              };
            }
            if (event.step === "completed") {
              toast.success("Generation completed.");
            }
            if (event.step === "error") {
              toast.error(event.message);
            }
          } catch {
            // Ignore non-JSON chunks.
          }
        }
      }

      setResult(latestResult);
    } catch {
      toast.error("Generation stream failed. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate"
        description="Launch premium athlete video renders with intelligent routing, validation, and auto-approval scoring."
        actions={
          <Button onClick={handleGenerate} disabled={!canGenerate} size="lg" className="gap-2">
            <Sparkles className="h-4 w-4" />
            {isGenerating ? "Generating..." : "GENERATE"}
          </Button>
        }
      />

      <div className="rounded-2xl border border-accent/30 bg-premium-glow p-1 shadow-panel">
        <div className="grid gap-4 rounded-2xl bg-card/95 p-5 lg:grid-cols-[1.2fr_1fr]">
          <Card className="border-none bg-transparent shadow-none">
            <CardHeader className="px-0">
              <CardTitle className="flex items-center gap-2 text-xl">
                <Wand2 className="h-5 w-5 text-[#9FD0FF]" />
                Generation Studio
              </CardTitle>
              <CardDescription>
                Curate athlete, template, and direction signals. The pipeline streams every step in real time.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 px-0">
              {isLoadingData ? (
                <div className="space-y-3">
                  <Skeleton className="h-10" />
                  <Skeleton className="h-10" />
                  <Skeleton className="h-28" />
                </div>
              ) : (
                <>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">Athlete</label>
                      <Select value={athleteId} onChange={(e) => setAthleteId(e.target.value)}>
                        <option value="">Select athlete</option>
                        {athletes.map((athlete) => (
                          <option key={athlete.id} value={athlete.id}>
                            {athlete.name} · {athlete.sport}
                          </option>
                        ))}
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-slate-300">Template</label>
                      <Select value={templateId} onChange={(e) => setTemplateId(e.target.value)}>
                        <option value="">Select template</option>
                        {templates.map((template) => (
                          <option key={template.id} value={template.id}>
                            {template.category} · {template.variant_name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-slate-300">Creative Direction</label>
                    <Textarea
                      placeholder="Add campaign context, sponsor callouts, mood, or CTA..."
                      value={customDirection}
                      onChange={(e) => setCustomDirection(e.target.value)}
                    />
                  </div>

                  <div className="rounded-lg border border-border bg-slate-900/50 p-3 text-sm text-slate-300">
                    <p className="font-medium text-slate-100">Prompt Preview</p>
                    <p className="mt-2">
                      {selectedAthlete?.name ?? "Athlete"} in {selectedTemplate?.location ?? "location"} executing{" "}
                      {selectedTemplate?.action ?? "signature action"} with{" "}
                      {selectedTemplate?.camera_angle ?? "cinematic framing"}.
                    </p>
                    <p className="mt-2 text-xs text-slate-400">
                      Tier: {selectedTemplate?.content_tier ?? "N/A"} · Platforms:{" "}
                      {selectedTemplate?.platforms?.join(", ") ?? "N/A"}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <ProgressTracker events={events} isRunning={isGenerating} />
        </div>
      </div>

      {result?.videoUrl ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PlayCircle className="h-5 w-5 text-[#9FD0FF]" />
              Generated Preview
            </CardTitle>
            <CardDescription>{result.filename}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <video controls className="w-full rounded-lg border border-border bg-black">
              <source src={result.videoUrl} />
            </video>
            <div className="flex flex-wrap gap-2">
              <Input value={result.videoUrl} readOnly />
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
