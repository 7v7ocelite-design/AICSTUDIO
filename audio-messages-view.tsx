"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Mic, Upload, Wand2, Play, Pause, Trash2, Download, StopCircle } from "lucide-react";

import type { Athlete, AudioMessage, VoiceClone } from "@/lib/types";
import { useToast } from "@/components/toast";

interface AudioMessagesViewProps {
  athletes: Athlete[];
  accessToken: string;
}

type TabId = "record" | "upload" | "generate";

const sourceBadge: Record<string, { label: string; cls: string }> = {
  recorded: { label: "Recorded", cls: "bg-blue-900/60 text-blue-300" },
  uploaded: { label: "Uploaded", cls: "bg-emerald-900/60 text-emerald-300" },
  ai_generated: { label: "AI Voice", cls: "bg-purple-900/60 text-purple-300" }
};

const formatDuration = (seconds: number | null) => {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
};

const formatDate = (d: string) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export const AudioMessagesView = ({ athletes, accessToken }: AudioMessagesViewProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<TabId>("record");
  const [selectedAthlete, setSelectedAthlete] = useState(athletes[0]?.id ?? "");
  const [messages, setMessages] = useState<AudioMessage[]>([]);
  const [voices, setVoices] = useState<VoiceClone[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Record state
  const [recording, setRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordTitle, setRecordTitle] = useState("");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [savingRecord, setSavingRecord] = useState(false);

  // Upload state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadTitle, setUploadTitle] = useState("");
  const [uploading, setUploading] = useState(false);

  // Generate state
  const [genVoiceId, setGenVoiceId] = useState("");
  const [genText, setGenText] = useState("");
  const [genTitle, setGenTitle] = useState("");
  const [generating, setGenerating] = useState(false);

  // Clone state
  const [cloneName, setCloneName] = useState("");
  const [cloneFiles, setCloneFiles] = useState<File[]>([]);
  const [cloning, setCloning] = useState(false);

  const fetchMessages = useCallback(async () => {
    if (!selectedAthlete) return;
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/audio?athlete_id=${selectedAthlete}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const payload = (await res.json()) as { data?: AudioMessage[] };
      setMessages(payload.data ?? []);
    } catch {
      toast("Failed to load audio messages.", "error");
    } finally {
      setLoadingMessages(false);
    }
  }, [selectedAthlete, accessToken, toast]);

  const fetchVoices = useCallback(async () => {
    if (!selectedAthlete) return;
    try {
      const res = await fetch(`/api/voices?athlete_id=${selectedAthlete}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      const payload = (await res.json()) as { data?: VoiceClone[] };
      setVoices(payload.data ?? []);
    } catch { /* ignore */ }
  }, [selectedAthlete, accessToken]);

  useEffect(() => {
    void fetchMessages();
    void fetchVoices();
  }, [fetchMessages, fetchVoices]);

  // ─── RECORDING ───
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      chunksRef.current = [];
      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setRecordedBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };
      mediaRecorderRef.current = mr;
      mr.start();
      setRecording(true);
      setRecordingTime(0);
      setRecordedBlob(null);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch {
      toast("Microphone access denied.", "error");
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const saveRecording = async () => {
    if (!recordedBlob || !selectedAthlete) return;
    setSavingRecord(true);
    try {
      const fd = new FormData();
      fd.append("athlete_id", selectedAthlete);
      fd.append("title", recordTitle || "Recording");
      fd.append("audio", recordedBlob, `recording.${recordedBlob.type.includes("webm") ? "webm" : "wav"}`);
      const res = await fetch("/api/audio/record", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      toast("Recording saved!", "success");
      setRecordedBlob(null);
      setRecordTitle("");
      setRecordingTime(0);
      void fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Save failed.", "error");
    } finally {
      setSavingRecord(false);
    }
  };

  // ─── UPLOAD ───
  const handleUpload = async () => {
    if (!uploadFile || !selectedAthlete) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("athlete_id", selectedAthlete);
      fd.append("title", uploadTitle || uploadFile.name);
      fd.append("audio", uploadFile);
      const res = await fetch("/api/audio/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Upload failed");
      toast("Audio uploaded!", "success");
      setUploadFile(null);
      setUploadTitle("");
      void fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Upload failed.", "error");
    } finally {
      setUploading(false);
    }
  };

  // ─── AI GENERATE ───
  const handleGenerate = async () => {
    if (!genVoiceId || !genText.trim() || !selectedAthlete) return;
    setGenerating(true);
    try {
      const res = await fetch("/api/audio/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          athleteId: selectedAthlete,
          voiceId: genVoiceId,
          text: genText,
          title: genTitle || undefined
        })
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Generation failed");
      toast("AI audio generated!", "success");
      setGenText("");
      setGenTitle("");
      void fetchMessages();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Generation failed.", "error");
    } finally {
      setGenerating(false);
    }
  };

  // ─── CLONE VOICE ───
  const handleClone = async () => {
    if (!cloneName || cloneFiles.length === 0 || !selectedAthlete) return;
    setCloning(true);
    try {
      const fd = new FormData();
      fd.append("athlete_id", selectedAthlete);
      fd.append("voice_name", cloneName);
      for (const f of cloneFiles) fd.append("samples", f);
      const res = await fetch("/api/audio/clone", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: fd
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Clone failed");
      toast("Voice clone created!", "success");
      setCloneName("");
      setCloneFiles([]);
      void fetchVoices();
    } catch (err) {
      toast(err instanceof Error ? err.message : "Clone failed.", "error");
    } finally {
      setCloning(false);
    }
  };

  // ─── DELETE ───
  const handleDelete = async (id: string) => {
    if (!confirm("Delete this audio message?")) return;
    try {
      await fetch("/api/audio", {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ id })
      });
      setMessages((prev) => prev.filter((m) => m.id !== id));
      toast("Deleted.", "success");
    } catch {
      toast("Delete failed.", "error");
    }
  };

  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: "record", label: "Record", icon: <Mic className="h-4 w-4" /> },
    { id: "upload", label: "Upload", icon: <Upload className="h-4 w-4" /> },
    { id: "generate", label: "AI Generate", icon: <Wand2 className="h-4 w-4" /> }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Audio Messages</h2>
        <p className="text-sm text-secondary mt-1">Record, upload, or AI-generate audio messages for athletes.</p>
      </div>

      {/* Athlete selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-secondary">Athlete</label>
        <select className="input max-w-xs" value={selectedAthlete} onChange={(e) => setSelectedAthlete(e.target.value)}>
          <option value="">Select athlete</option>
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--border-subtle)]">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition ${
              activeTab === tab.id
                ? "border-b-2 border-accent text-white"
                : "text-secondary hover:text-white"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        {activeTab === "record" && (
          <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
              {!recording && !recordedBlob && (
                <button
                  type="button"
                  onClick={startRecording}
                  disabled={!selectedAthlete}
                  className="flex h-20 w-20 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500 disabled:opacity-50"
                >
                  <Mic className="h-8 w-8" />
                </button>
              )}
              {recording && (
                <>
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="flex h-20 w-20 animate-pulse items-center justify-center rounded-full bg-red-600 text-white"
                  >
                    <StopCircle className="h-8 w-8" />
                  </button>
                  <p className="text-sm text-secondary">Recording... {Math.floor(recordingTime / 60)}:{String(recordingTime % 60).padStart(2, "0")}</p>
                </>
              )}
              {recordedBlob && !recording && (
                <div className="w-full space-y-3">
                  <audio controls src={URL.createObjectURL(recordedBlob)} className="w-full" />
                  <input
                    className="input"
                    value={recordTitle}
                    onChange={(e) => setRecordTitle(e.target.value)}
                    placeholder="Title (optional)"
                  />
                  <div className="flex gap-2">
                    <button className="button-primary flex-1" onClick={saveRecording} disabled={savingRecord} type="button">
                      {savingRecord ? "Saving..." : "Save Recording"}
                    </button>
                    <button className="button-secondary" onClick={() => { setRecordedBlob(null); setRecordingTime(0); }} type="button">
                      Discard
                    </button>
                  </div>
                </div>
              )}
              {!recording && !recordedBlob && (
                <p className="text-xs text-muted">Click the mic button to start recording</p>
              )}
            </div>
          </div>
        )}

        {activeTab === "upload" && (
          <div className="space-y-4">
            <div
              className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-[var(--border-subtle)] p-8 transition hover:border-[var(--border-active)]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const file = e.dataTransfer.files[0];
                if (file?.type.startsWith("audio/")) setUploadFile(file);
              }}
            >
              <Upload className="h-8 w-8 text-muted" />
              <p className="text-sm text-secondary">Drag & drop audio file or</p>
              <label className="button-secondary cursor-pointer text-sm">
                Browse Files
                <input
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => setUploadFile(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="text-[10px] text-muted">MP3, WAV, M4A, WebM, OGG — Max 50MB</p>
            </div>
            {uploadFile && (
              <div className="space-y-3">
                <p className="text-sm text-secondary">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</p>
                <input
                  className="input"
                  value={uploadTitle}
                  onChange={(e) => setUploadTitle(e.target.value)}
                  placeholder="Title (optional)"
                />
                <button className="button-primary w-full" onClick={handleUpload} disabled={uploading || !selectedAthlete} type="button">
                  {uploading ? "Uploading..." : "Upload Audio"}
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "generate" && (
          <div className="space-y-5">
            {voices.length > 0 ? (
              <div className="space-y-2">
                <label className="text-xs font-medium text-secondary">Voice</label>
                <select className="input" value={genVoiceId} onChange={(e) => setGenVoiceId(e.target.value)}>
                  <option value="">Select voice clone</option>
                  {voices.map((v) => (
                    <option key={v.id} value={v.elevenlabs_voice_id}>
                      {v.voice_name} ({v.sample_count} samples)
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="rounded-lg border border-amber-700 bg-amber-950/40 p-3">
                <p className="text-sm text-amber-300">No voice clone yet. Create one below first.</p>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-medium text-secondary">Message Script</label>
              <textarea
                className="input min-h-24"
                value={genText}
                onChange={(e) => setGenText(e.target.value)}
                placeholder="Type the message the athlete should say..."
              />
              <p className="text-[10px] text-muted text-right">{genText.length} characters</p>
            </div>

            <input
              className="input"
              value={genTitle}
              onChange={(e) => setGenTitle(e.target.value)}
              placeholder="Title (optional)"
            />

            <button
              className="button-primary w-full"
              onClick={handleGenerate}
              disabled={generating || !genVoiceId || !genText.trim() || !selectedAthlete}
              type="button"
            >
              {generating ? "Generating..." : "Generate AI Audio"}
            </button>

            {/* Voice Clone Creator */}
            <div className="mt-4 space-y-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-panel)] p-4">
              <h4 className="text-sm font-semibold">Create Voice Clone</h4>
              <p className="text-xs text-muted">Upload 1–5 audio samples of the athlete speaking (clean speech, 1+ minute each).</p>
              <input
                className="input"
                value={cloneName}
                onChange={(e) => setCloneName(e.target.value)}
                placeholder="Voice name (e.g. Jayden Daniels)"
              />
              <input
                type="file"
                accept="audio/*"
                multiple
                className="input p-2"
                onChange={(e) => setCloneFiles(Array.from(e.target.files ?? []))}
              />
              {cloneFiles.length > 0 && (
                <p className="text-xs text-secondary">{cloneFiles.length} file{cloneFiles.length !== 1 ? "s" : ""} selected</p>
              )}
              <button
                className="button-secondary w-full"
                onClick={handleClone}
                disabled={cloning || !cloneName || cloneFiles.length === 0 || !selectedAthlete}
                type="button"
              >
                {cloning ? "Creating Clone..." : "Create Voice Clone"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Audio Messages List */}
      <div>
        <h3 className="text-sm font-semibold text-secondary mb-3">
          {loadingMessages ? "Loading..." : `${messages.length} Audio Message${messages.length !== 1 ? "s" : ""}`}
        </h3>
        <div className="space-y-2">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className="flex items-center gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-medium text-[var(--text-primary)] truncate">{msg.title}</p>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${sourceBadge[msg.source_type]?.cls ?? "bg-neutral-700 text-neutral-300"}`}>
                    {sourceBadge[msg.source_type]?.label ?? msg.source_type}
                  </span>
                </div>
                <p className="text-[10px] text-muted">
                  {formatDuration(msg.duration_seconds)} · {formatDate(msg.created_at)}
                  {msg.transcript && ` · "${msg.transcript.slice(0, 60)}${msg.transcript.length > 60 ? "..." : ""}"`}
                </p>
              </div>
              {msg.audio_url && (
                <audio controls src={msg.audio_url} className="h-8 w-48 flex-shrink-0" preload="metadata" />
              )}
              <div className="flex gap-1 flex-shrink-0">
                {msg.audio_url && (
                  <a href={msg.audio_url} download className="rounded p-1.5 text-secondary hover:text-white transition">
                    <Download className="h-4 w-4" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(msg.id)}
                  className="rounded p-1.5 text-secondary hover:text-red-500 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
          {!loadingMessages && messages.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              {selectedAthlete ? "No audio messages yet." : "Select an athlete to see audio messages."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
