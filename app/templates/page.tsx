"use client";

import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Template } from "@/lib/types";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/templates", { cache: "no-store" });
        const payload = (await response.json()) as { templates: Template[] };
        setTemplates(payload.templates ?? []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, Template[]>();
    const term = search.toLowerCase();

    templates
      .filter((template) =>
        [
          template.category,
          template.variant_name,
          template.action,
          template.location,
          template.content_tier
        ]
          .join(" ")
          .toLowerCase()
          .includes(term)
      )
      .forEach((template) => {
        const existing = map.get(template.category) ?? [];
        existing.push(template);
        map.set(template.category, existing);
      });

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [templates, search]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Templates"
        description="Browse and filter all content blueprints, grouped by campaign category and tier."
      />

      <Card>
        <CardHeader>
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-slate-500" />
            <Input
              className="pl-9"
              placeholder="Search templates by category, variant, tier..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <>
              <Skeleton className="h-48" />
              <Skeleton className="h-48" />
            </>
          ) : grouped.length === 0 ? (
            <p className="text-sm text-slate-400">No templates found with that filter.</p>
          ) : (
            grouped.map(([category, categoryTemplates]) => (
              <div key={category} className="rounded-xl border border-border/60 bg-slate-900/30 p-4">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-slate-100">{category}</h3>
                  <span className="text-xs text-slate-400">{categoryTemplates.length} variants</span>
                </div>

                <div className="grid gap-3">
                  {categoryTemplates.map((template) => (
                    <div
                      key={template.id}
                      className="rounded-lg border border-border/60 bg-card p-4 transition hover:border-accent/50"
                    >
                      <div className="mb-2 flex flex-wrap items-center gap-2">
                        <p className="font-medium text-slate-100">{template.variant_name}</p>
                        <Badge variant={template.content_tier === "premium" ? "default" : "neutral"}>
                          {template.content_tier}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-300">
                        {template.action} · {template.location} · {template.camera_angle}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {template.platforms.join(", ")} · {template.audio_track}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
