"use client";

import { useState } from "react";
import { Loader2, ImageIcon, Clapperboard, Sparkles, Zap } from "lucide-react";

import type { Athlete, Job } from "@/lib/types";
import { useToast } from "@/components/toast";

interface AnimatePhotoProps {
  athletes: Athlete[];
  accessToken: string;
  onJobCreated: (job: Job) => void;
}

const PRESETS = [
  { id: "cinematic-intro", label: "Cinematic Intro", icon: <Clapperboard className="h-5 w-5" />, duration: "5 sec", description: "Slow cinematic zoom, dramatic lighting" },
  { id: "hero-reveal", label: "Hero Reveal", icon: <Sparkles className="h-5 w-5" />, duration: "4 sec", description: "Photo comes to life with subtle motion" },
  { id: "social-ready", label: "Social Ready", icon: <Zap className="h-5 w-5" />, duration: "3 sec", description: "Dynamic quick zoom, trending social style" }
];

export const AnimatePhoto = ({ athletes, accessToken, onJobCreated }: AnimatePhotoProps) => {
  const { toast } = useToast();
  const [selectedAthlete, setSelectedAthlete] = useState(athletes.find((a) => a.consent_signed && a.reference_photo_url)?.id ?? "");
  const [selectedPreset, setSelectedPreset] = useState("cinematic-intro");
  const [motionPrompt, setMotionPrompt] = useState("");
  const [generating, setGenerating] = useState(false);

  const athlete = athletes.find((a) => a.id === selectedAthlete);
  const hasPhoto = !!athlete?.reference_photo_url;
  const consentMissing = athlete && !athlete.consent_signed;

  const pollForCompletion = async (jobId: string) => {
    const maxPolls = 60; // 60 x 10s = 10 minutes
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        const job = await res.json();
        if (job.status === "completed") {
          onJobCreated(job as Job);
          toast("Animation ready!", "success");
          return;
        }
        if (job.status === "failed") {
          onJobCreated(job as Job);
          toast(`Animation failed: ${job.error_message || "Unknown error"}`, "error");
          return;
        }
        const elapsed = (i + 1) * 10;
        toast(`Animating with Runway... (${elapsed}s elapsed)`, "info");
      } catch {
        // Network error — keep trying
      }
    }
    toast("Timed out waiting for animation. Check job queue.", "error");
  };

  const handleAnimate = async () => {
    if (!selectedAthlete) { toast("Select an athlete.", "error"); return; }
    if (!hasPhoto) { toast("This athlete has no reference photo. Upload one first.", "error"); return; }
    setGenerating(true);
    try {
      const res = await fetch("/api/jobs/animate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ athleteId: selectedAthlete, animationStyle: selectedPreset, motionPrompt: motionPrompt.trim() || null })
      });
      const payload = await res.json();
      if (!res.ok || !payload.data) {
        throw new Error(payload.error ?? "Animation failed.");
      }
      onJobCreated(payload.data as Job);

      if (payload.polling || payload.data.status === "processing") {
        toast("Animation generating with Runway... (2-4 minutes)", "info");
        await pollForCompletion(payload.data.id);
      } else {
        toast(`Animation generated: ${payload.data.status}`, "success");
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : "Animation failed.", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Animate Photo</h2>
        <p className="text-sm text-secondary mt-1">Turn an athlete&apos;s reference photo into a short animated clip.</p>
      </div>

      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-medium text-secondary">Athlete</label>
          <select className="input" value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
            <option value="">Select athlete</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.consent_signed ? "✓" : "✗"} {a.name} {a.reference_photo_url ? "📷" : ""}</option>
            ))}
          </select>
        </div>

        {athlete && !hasPhoto && (
          <div className="flex items-center gap-3 rounded-lg border border-amber-700 bg-amber-950/60 px-4 py-3">
            <ImageIcon className="h-5 w-5 text-amber-400 flex-shrink-0" />
            <p className="text-sm text-amber-300">No reference photo uploaded for {athlete.name}. Upload one through the Athletes view first.</p>
          </div>
        )}

        {athlete && hasPhoto && (
          <div className="flex items-center gap-3 rounded-lg border border-emerald-800 bg-emerald-950/40 px-4 py-3">
            <ImageIcon className="h-5 w-5 text-emerald-400 flex-shrink-0" />
            <p className="text-sm text-emerald-300">Reference photo loaded for {athlete.name}.</p>
          </div>
        )}

        <div className="space-y-2">
          <label className="text-xs font-medium text-secondary">Animation Style</label>
          <div className="grid gap-3 md:grid-cols-3">
            {PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPreset(p.id)}
                className={`rounded-lg border p-4 text-center transition ${
                  selectedPreset === p.id
                    ? "border-accent bg-accent/10"
                    : "border-[var(--border-subtle)] bg-[var(--bg-panel)] hover:border-[var(--border-active)]"
                }`}
              >
                <div className={`mx-auto mb-2 ${selectedPreset === p.id ? "text-accent" : "text-secondary"}`}>{p.icon}</div>
                <p className="text-xs font-semibold text-[var(--text-primary)]">{p.label}</p>
                <p className="text-[10px] text-muted mt-0.5">{p.duration}</p>
                <p className="text-[10px] text-muted">{p.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-secondary">Motion Prompt (optional)</label>
          <textarea
            className="input min-h-16"
            value={motionPrompt}
            onChange={(e) => setMotionPrompt(e.target.value)}
            placeholder="Subtle head turn, confident smile, wind in clothing..."
          />
        </div>

        {consentMissing && (
          <p className="rounded-lg border border-amber-700 bg-amber-950/60 px-3 py-2 text-sm text-amber-300">⚠ Consent release not signed.</p>
        )}

        <button
          className="button-primary w-full py-3.5 text-base font-bold"
          disabled={generating || !selectedAthlete || !hasPhoto || !!consentMissing}
          onClick={handleAnimate}
          type="button"
        >
          {generating ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-5 w-5 animate-spin" /> Animating...</span> : "ANIMATE"}
        </button>
      </div>
    </div>
  );
};
