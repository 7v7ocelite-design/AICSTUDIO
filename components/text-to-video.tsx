"use client";

import { useState } from "react";
import { Loader2, Info } from "lucide-react";

import type { Athlete, Job } from "@/lib/types";
import { useToast } from "@/components/toast";
import { pollUntilDone } from "@/hooks/use-job-polling";

interface TextToVideoProps {
  athletes: Athlete[];
  accessToken: string;
  onJobCreated: (job: Job) => void;
}

export const TextToVideo = ({ athletes, accessToken, onJobCreated }: TextToVideoProps) => {
  const { toast } = useToast();
  const [selectedAthlete, setSelectedAthlete] = useState(athletes.find((a) => a.consent_signed)?.id ?? "");
  const [prompt, setPrompt] = useState("");
  const [duration, setDuration] = useState("10");
  const [ratio, setRatio] = useState("1280:720");
  const [generating, setGenerating] = useState(false);

  const athlete = athletes.find((a) => a.id === selectedAthlete);
  const consentMissing = athlete && !athlete.consent_signed;

  const handleGenerate = async () => {
    if (!selectedAthlete || !prompt.trim()) { toast("Select an athlete and enter a prompt.", "error"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ athleteId: selectedAthlete, custom_prompt: prompt.trim(), duration: Number(duration), ratio })
      });

      let payload: { data?: Job; error?: string; code?: string; polling?: boolean } | null = null;
      try {
        payload = (await res.json()) as { data?: Job; error?: string; code?: string; polling?: boolean };
      } catch {
        payload = null;
      }

      if (!res.ok) {
        toast(payload?.error ?? `Generation failed (HTTP ${res.status}).`, "error");
        return;
      }

      if (!payload?.data) {
        toast("Generation failed.", "error");
        return;
      }
      onJobCreated(payload.data as Job);

      if (payload.polling && payload.data.id) {
        toast("Video generating with Runway... (2-4 minutes)", "info");
        await pollUntilDone({
          jobId: payload.data.id,
          accessToken,
          onUpdate: (job) => onJobCreated(job),
          onProgress: (msg, type) => toast(msg, type),
          actionLabel: "Generating",
        });
      } else {
        toast(`Video generated: ${payload.data.status}`, "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed.", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Text-to-Video</h2>
        <p className="text-sm text-secondary mt-1">Write a fully custom prompt instead of using a template.</p>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-secondary">Athlete</label>
          <select className="input" value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
            <option value="">Select athlete</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.consent_signed ? "✓" : "✗"} {a.name}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-secondary">Custom Prompt</label>
          <textarea
            className="input min-h-32"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={athlete ? `${athlete.descriptor}. Walking through a neon-lit city at night, wearing designer streetwear...` : "Describe the video scene in detail..."}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-xs font-medium text-secondary">Duration</label>
            <select className="input" value={duration} onChange={(e) => setDuration(e.target.value)}>
              {[5, 6, 7, 8, 9, 10].map((d) => (
                <option key={d} value={d}>{d} seconds</option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-medium text-secondary">Aspect Ratio</label>
            <div className="flex gap-2">
              {[
                { value: "1280:720", label: "16:9" },
                { value: "720:1280", label: "9:16" },
                { value: "960:960", label: "1:1" }
              ].map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => setRatio(r.value)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-medium transition ${
                    ratio === r.value
                      ? "border-accent bg-accent/10 text-accent"
                      : "border-[var(--border-subtle)] bg-[var(--bg-panel)] text-secondary hover:text-white"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {consentMissing && (
          <p className="rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2 text-sm text-amber-300">
            ⚠ Consent release not signed.
          </p>
        )}

        <button
          className="button-primary w-full py-3.5 text-base font-bold"
          disabled={generating || !selectedAthlete || !prompt.trim() || !!consentMissing}
          onClick={handleGenerate}
          type="button"
        >
          {generating ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Generating...</span> : "GENERATE"}
        </button>
      </div>

      <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
        <div className="flex items-center gap-2 mb-2">
          <Info className="h-4 w-4 text-secondary" />
          <h3 className="text-xs font-semibold text-secondary">Prompt Tips</h3>
        </div>
        <ul className="space-y-1 text-[11px] text-muted">
          <li>&bull; Front-load the visual hook &mdash; what the viewer sees first</li>
          <li>&bull; Avoid close-ups of hands and teeth (top artifact zones)</li>
          <li>&bull; Include lighting and camera angle for consistency</li>
          <li>&bull; Add negatives at the end: &ldquo;No distortion, no extra limbs&rdquo;</li>
          <li>&bull; Start with the athlete&apos;s physical descriptor for likeness grounding</li>
        </ul>
      </div>
    </div>
  );
};
