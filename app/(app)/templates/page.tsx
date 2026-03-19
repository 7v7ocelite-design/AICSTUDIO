"use client";

import { TierBadge } from "@/components/ui/tier-badge";
import { Template } from "@/lib/types";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const emptyTemplate: Omit<Template, "id" | "created_at" | "updated_at"> = {
  category: "",
  variant: "",
  action: "",
  location: "",
  wardrobe: "",
  lighting: "",
  camera_angle: "",
  audio_track: "",
  target_platforms: [],
  content_tier: "standard",
};

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(emptyTemplate);

  async function loadTemplates() {
    try {
      setLoading(true);
      const response = await fetch("/api/templates");
      const json = (await response.json()) as { templates: Template[] };
      setTemplates(json.templates ?? []);
    } catch {
      toast.error("Failed to load templates");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTemplates();
  }, []);

  const grouped = useMemo(
    () =>
      templates.reduce<Record<string, Template[]>>((acc, template) => {
        acc[template.category] = acc[template.category] ? [...acc[template.category], template] : [template];
        return acc;
      }, {}),
    [templates],
  );

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    try {
      const response = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) throw new Error("Failed to create template");
      toast.success("Template created");
      setForm(emptyTemplate);
      setShowAdd(false);
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Create failed");
    }
  }

  async function handleDelete(id: string) {
    try {
      const response = await fetch(`/api/templates/${id}`, { method: "DELETE" });
      if (!response.ok) throw new Error("Failed to delete template");
      toast.success("Template deleted");
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delete failed");
    }
  }

  async function handleQuickEdit(template: Template) {
    const variant = window.prompt("Edit variant name", template.variant);
    if (!variant) return;
    try {
      const response = await fetch(`/api/templates/${template.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ variant }),
      });
      if (!response.ok) throw new Error("Failed to update template");
      toast.success("Template updated");
      await loadTemplates();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Update failed");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Templates</h1>
          <p className="text-sm text-slate-400">Grouped prompt templates by category and tier.</p>
        </div>
        <button
          className="rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold"
          onClick={() => setShowAdd((prev) => !prev)}
        >
          {showAdd ? "Close" : "Add Template"}
        </button>
      </div>

      {showAdd ? (
        <form onSubmit={handleCreate} className="card grid gap-3 p-4 md:grid-cols-2">
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Category"
            value={form.category}
            onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Variant"
            value={form.variant}
            onChange={(event) => setForm((prev) => ({ ...prev, variant: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2 md:col-span-2"
            placeholder="Action"
            value={form.action}
            onChange={(event) => setForm((prev) => ({ ...prev, action: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Location"
            value={form.location}
            onChange={(event) => setForm((prev) => ({ ...prev, location: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Wardrobe"
            value={form.wardrobe}
            onChange={(event) => setForm((prev) => ({ ...prev, wardrobe: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Lighting"
            value={form.lighting}
            onChange={(event) => setForm((prev) => ({ ...prev, lighting: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Camera angle"
            value={form.camera_angle}
            onChange={(event) => setForm((prev) => ({ ...prev, camera_angle: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Audio track"
            value={form.audio_track}
            onChange={(event) => setForm((prev) => ({ ...prev, audio_track: event.target.value }))}
          />
          <input
            required
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            placeholder="Platforms (comma-separated)"
            value={form.target_platforms.join(", ")}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                target_platforms: event.target.value
                  .split(",")
                  .map((platform) => platform.trim())
                  .filter(Boolean),
              }))
            }
          />
          <select
            className="rounded-lg border border-slate-600 bg-slate-900/70 p-2"
            value={form.content_tier}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, content_tier: event.target.value as Template["content_tier"] }))
            }
          >
            <option value="standard">standard</option>
            <option value="premium">premium</option>
            <option value="social">social</option>
          </select>
          <button className="rounded-lg bg-[#2E75B6] px-4 py-2 text-sm font-semibold md:col-span-2">
            Save Template
          </button>
        </form>
      ) : null}

      <div className="space-y-3">
        {loading ? (
          <p className="text-sm text-slate-400">Loading templates...</p>
        ) : (
          Object.entries(grouped).map(([category, items]) => (
            <details key={category} className="card p-4" open>
              <summary className="cursor-pointer list-none">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold">{category}</h2>
                  <span className="text-xs text-slate-400">{items.length} variants</span>
                  <TierBadge tier={items[0].content_tier} />
                </div>
              </summary>
              <div className="mt-3 space-y-2">
                {items.map((template) => (
                  <div
                    key={template.id}
                    className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 text-sm"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="font-medium">{template.variant}</p>
                        <p className="text-xs text-slate-400">
                          {template.location} · {template.target_platforms.join(", ")} · {template.audio_track}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          className="rounded border border-slate-600 px-2 py-1 text-xs"
                          onClick={() => void handleQuickEdit(template)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded border border-rose-500/50 px-2 py-1 text-xs text-rose-300"
                          onClick={() => void handleDelete(template.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 grid gap-2 text-xs text-slate-300 md:grid-cols-2">
                      <p>
                        <span className="text-slate-400">Action:</span> {template.action}
                      </p>
                      <p>
                        <span className="text-slate-400">Wardrobe:</span> {template.wardrobe}
                      </p>
                      <p>
                        <span className="text-slate-400">Lighting:</span> {template.lighting}
                      </p>
                      <p>
                        <span className="text-slate-400">Camera:</span> {template.camera_angle}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </details>
          ))
        )}
      </div>
    </div>
  );
}
