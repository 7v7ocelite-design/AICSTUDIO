"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";

import type { Template } from "@/lib/types";

interface TemplatesViewProps {
  templates: Template[];
  onAddTemplate: () => void;
}

const tierBadge: Record<string, string> = {
  standard: "bg-blue-900/60 text-blue-300",
  premium: "bg-purple-900/60 text-purple-300",
  social: "bg-amber-900/60 text-amber-300"
};

export const TemplatesView = ({ templates, onAddTemplate }: TemplatesViewProps) => {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");

  const filtered = templates.filter((t) => {
    if (tierFilter !== "all" && t.content_tier !== tierFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return t.category.toLowerCase().includes(q) || t.variant_name.toLowerCase().includes(q) || t.action.toLowerCase().includes(q);
    }
    return true;
  });

  const grouped = new Map<string, Template[]>();
  for (const t of filtered) {
    const arr = grouped.get(t.category) ?? [];
    arr.push(t);
    grouped.set(t.category, arr);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Templates</h2>
          <p className="text-sm text-secondary mt-1">{templates.length} template{templates.length !== 1 ? "s" : ""} across {new Set(templates.map((t) => t.category)).size} categories</p>
        </div>
        <button className="button-primary flex items-center gap-2" onClick={onAddTemplate} type="button">
          <Plus className="h-4 w-4" /> Add Template
        </button>
      </div>

      {templates.length > 0 && (
        <>
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input className="input pl-10" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search templates..." />
            </div>
            <select className="input max-w-[140px]" value={tierFilter} onChange={(e) => setTierFilter(e.target.value)}>
              <option value="all">All tiers</option>
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="social">Social</option>
            </select>
          </div>

          <div className="space-y-6">
            {[...grouped.entries()].map(([category, items]) => (
              <div key={category}>
                <h3 className="mb-2 text-sm font-semibold text-secondary">{category}</h3>
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {items.map((t) => (
                    <div key={t.id} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3 transition hover:border-[var(--border-active)]">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-[var(--text-primary)]">{t.variant_name}</span>
                        <div className="flex items-center gap-1">
                          {t.render_engine === "creatomate" ? (
                            <span className="rounded px-1.5 py-0.5 text-[10px] bg-blue-accent/20 text-blue-accent">Template</span>
                          ) : (
                            <span className="rounded px-1.5 py-0.5 text-[10px] bg-purple-500/20 text-purple-400">AI</span>
                          )}
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${tierBadge[t.content_tier] ?? "bg-neutral-700 text-neutral-300"}`}>
                            {t.content_tier}
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-secondary line-clamp-2">{t.action}</p>
                      <p className="mt-1 text-[10px] text-muted">{t.location}</p>
                      {t.preview_video_url && (
                        <video src={t.preview_video_url} className="mt-2 rounded w-full h-20 object-cover" muted preload="metadata" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
