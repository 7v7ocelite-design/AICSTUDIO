"use client";

import { useRef, useState } from "react";
import { Send, Sparkles, Clapperboard, Lightbulb, MessageSquare, HelpCircle } from "lucide-react";

import type { Athlete, Job, Template } from "@/lib/types";
import { useToast } from "@/components/toast";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  recommendation?: {
    template_id: string;
    template_label: string;
    prompt: string;
    tier: string;
  } | null;
}

interface ChatAssistantProps {
  athletes: Athlete[];
  templates: Template[];
  accessToken: string;
  onJobCreated: (job: Job) => void;
}

export const ChatAssistant = ({ athletes, templates, accessToken, onJobCreated }: ChatAssistantProps) => {
  const { toast } = useToast();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [selectedAthlete, setSelectedAthlete] = useState(athletes.find((a) => a.consent_signed)?.id ?? "");
  const [sending, setSending] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);

  const athleteName = athletes.find((a) => a.id === selectedAthlete)?.name ?? "an athlete";

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          message: text.trim(),
          athleteId: selectedAthlete || null,
          history: messages.slice(-10).map((m) => ({ role: m.role, content: m.content }))
        })
      });
      const data = await res.json();
      const assistantMsg: ChatMessage = {
        role: "assistant",
        content: data.message ?? data.error ?? "Something went wrong.",
        recommendation: data.recommendation ?? null
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 100);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Failed to get a response. Check your connection." }]);
    } finally {
      setSending(false);
    }
  };

  const handleGenerate = async (rec: NonNullable<ChatMessage["recommendation"]>) => {
    if (!selectedAthlete) { toast("Select an athlete first.", "error"); return; }
    setGenerating(rec.template_id);
    try {
      const body: Record<string, string> = { athleteId: selectedAthlete };
      if (rec.template_id) body.templateId = rec.template_id;
      else body.custom_prompt = rec.prompt;

      const res = await fetch("/api/jobs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(body)
      });
      const payload = await res.json();
      if (res.ok && payload.data) {
        toast(`Video generated: ${payload.data.status}`, "success");
        onJobCreated(payload.data as Job);
        setMessages((prev) => [...prev, {
          role: "assistant",
          content: `✅ Video generated! Status: **${payload.data.status}**. Check the job queue to review.`
        }]);
      } else {
        toast(payload.error ?? "Generation failed.", "error");
      }
    } catch {
      toast("Generation request failed.", "error");
    } finally {
      setGenerating(null);
    }
  };

  const starters = [
    { icon: <Lightbulb className="h-3.5 w-3.5" />, text: `Content ideas for ${athleteName}` },
    { icon: <Clapperboard className="h-3.5 w-3.5" />, text: "Create a brand deal spec video" },
    { icon: <HelpCircle className="h-3.5 w-3.5" />, text: "What makes a good prompt?" },
    { icon: <Sparkles className="h-3.5 w-3.5" />, text: "Trending content styles right now" }
  ];

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-accent" />
          <div>
            <h2 className="text-base font-semibold">Creative Assistant</h2>
            <p className="text-[11px] text-secondary">Describe what you want — I&apos;ll craft the perfect prompt.</p>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="space-y-3 pt-8">
            <p className="text-center text-sm text-secondary">How can I help you create content today?</p>
            <div className="grid gap-2">
              {starters.map((s) => (
                <button
                  key={s.text}
                  type="button"
                  onClick={() => sendMessage(s.text)}
                  className="flex items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-2.5 text-left text-sm text-secondary transition hover:border-[var(--border-active)] hover:text-white"
                >
                  {s.icon}
                  {s.text}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-lg px-4 py-3 text-sm ${
              msg.role === "user"
                ? "bg-[var(--bg-card)] text-[var(--text-primary)]"
                : "bg-[var(--bg-panel)] border border-[var(--border-subtle)] text-[var(--text-primary)]"
            }`}>
              <p className="whitespace-pre-wrap">{msg.content}</p>
              {msg.recommendation && (
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3 space-y-2">
                  <p className="text-xs font-medium text-accent">{msg.recommendation.template_label} ({msg.recommendation.tier})</p>
                  <p className="text-[11px] text-secondary italic line-clamp-3">&ldquo;{msg.recommendation.prompt}&rdquo;</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      disabled={generating === msg.recommendation.template_id}
                      onClick={() => handleGenerate(msg.recommendation!)}
                      className="button-primary py-1.5 px-4 text-xs"
                    >
                      {generating === msg.recommendation.template_id ? "Generating..." : "🎬 Generate This"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {sending && (
          <div className="flex justify-start">
            <div className="rounded-lg bg-[var(--bg-panel)] border border-[var(--border-subtle)] px-4 py-3">
              <span className="flex gap-1 text-secondary">
                <span className="animate-bounce">·</span>
                <span className="animate-bounce" style={{ animationDelay: "0.1s" }}>·</span>
                <span className="animate-bounce" style={{ animationDelay: "0.2s" }}>·</span>
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Athlete selector + input */}
      <div className="border-t border-[var(--border-subtle)] px-4 py-3 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-muted">Athlete:</span>
          <select
            className="input py-1 text-xs max-w-[200px]"
            value={selectedAthlete}
            onChange={(e) => setSelectedAthlete(e.target.value)}
          >
            <option value="">None</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>{a.consent_signed ? "✓" : "✗"} {a.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input
            className="input flex-1"
            placeholder="Describe what you want to create..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && !sending) { e.preventDefault(); sendMessage(input); } }}
            disabled={sending}
          />
          <button
            type="button"
            disabled={sending || !input.trim()}
            onClick={() => sendMessage(input)}
            className="button-primary px-3"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
