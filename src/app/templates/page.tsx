"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CardSkeleton } from "@/components/ui/skeleton";
import { getTierBadge } from "@/lib/utils";
import type { Template } from "@/lib/types";
import { TIER_ENGINES } from "@/lib/types";
import {
  LayoutTemplate,
  Search,
  Play,
  MapPin,
  Camera,
  Sun,
  Shirt,
  Volume2,
  Zap,
  ChevronDown,
  ChevronRight,
} from "lucide-react";

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/templates");
        if (res.ok) {
          const data = await res.json();
          setTemplates(data.templates || []);
          const cats = new Set<string>(
            (data.templates || []).map((t: Template) => t.category)
          );
          setExpandedCategories(cats);
        }
      } catch {
        // silent
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function toggleCategory(cat: string) {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) next.delete(cat);
      else next.add(cat);
      return next;
    });
  }

  const filtered = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.category.toLowerCase().includes(search.toLowerCase()) ||
      t.variant_name.toLowerCase().includes(search.toLowerCase()) ||
      t.action.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || t.content_tier === tierFilter;
    return matchesSearch && matchesTier;
  });

  const grouped = filtered.reduce<Record<string, Template[]>>((acc, t) => {
    (acc[t.category] ||= []).push(t);
    return acc;
  }, {});

  return (
    <div className="space-y-6 pt-12 lg:pt-0">
      <div>
        <h1 className="text-2xl font-bold text-white">Template Library</h1>
        <p className="mt-1 text-sm text-gray-400">
          {templates.length} prompt templates across{" "}
          {new Set(templates.map((t) => t.category)).size} categories
        </p>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <Input
            placeholder="Search templates..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex gap-2">
          {["all", "premium", "standard", "social"].map((tier) => (
            <button
              key={tier}
              onClick={() => setTierFilter(tier)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                tierFilter === tier
                  ? "bg-brand-accent text-white"
                  : "bg-white/5 text-gray-400 hover:bg-white/10"
              }`}
            >
              {tier.charAt(0).toUpperCase() + tier.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-16 text-center">
          <LayoutTemplate className="mb-3 h-12 w-12 text-gray-600" />
          <p className="text-lg font-medium text-gray-400">
            No templates found
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Run the seed script to populate templates
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([category, temps]) => (
            <div key={category} className="rounded-xl border border-white/5 bg-brand-card overflow-hidden">
              <button
                onClick={() => toggleCategory(category)}
                className="flex w-full items-center justify-between px-6 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedCategories.has(category) ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                  )}
                  <h3 className="text-sm font-semibold text-white">
                    {category}
                  </h3>
                  <Badge
                    className={getTierBadge(temps[0].content_tier)}
                    variant="outline"
                  >
                    {temps[0].content_tier}
                  </Badge>
                </div>
                <span className="text-xs text-gray-500">
                  {temps.length} variant{temps.length !== 1 ? "s" : ""}
                </span>
              </button>

              {expandedCategories.has(category) && (
                <div className="border-t border-white/5 p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {temps.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-lg border border-white/5 bg-white/[0.02] p-4 hover:border-brand-accent/20 transition-colors"
                      >
                        <div className="mb-3 flex items-center justify-between">
                          <h4 className="text-sm font-medium text-white">
                            {t.variant_name}
                          </h4>
                        </div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex items-center gap-2 text-gray-400">
                            <Play className="h-3 w-3 text-brand-accent" />
                            <span className="truncate">{t.action}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <MapPin className="h-3 w-3 text-brand-accent" />
                            <span className="truncate">{t.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Camera className="h-3 w-3 text-brand-accent" />
                            <span className="truncate">{t.camera_angle}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Sun className="h-3 w-3 text-brand-accent" />
                            <span className="truncate">{t.lighting}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Shirt className="h-3 w-3 text-brand-accent" />
                            <span className="truncate">{t.wardrobe}</span>
                          </div>
                          <div className="flex items-center gap-2 text-gray-400">
                            <Volume2 className="h-3 w-3 text-brand-accent" />
                            <span className="truncate">{t.audio_track}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-2">
                          <Zap className="h-3 w-3 text-gray-500" />
                          <span className="text-[10px] text-gray-500">
                            {TIER_ENGINES[t.content_tier]}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {t.platforms.map((p) => (
                            <span
                              key={p}
                              className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-gray-500"
                            >
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
