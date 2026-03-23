"use client";

import { useCallback, useEffect, useState } from "react";
import { PanelRight } from "lucide-react";

import type { Athlete, DashboardBootstrap, Job, Template } from "@/lib/types";
import { ToastProvider, useToast } from "@/components/toast";
import { Sidebar, type ViewId } from "@/components/sidebar";
import { ApiMonitor } from "@/components/api-monitor";
import { GenerateView } from "@/components/generate-view";
import { ChatAssistant } from "@/components/chat-assistant";
import { TextToVideo } from "@/components/text-to-video";
import { AnimatePhoto } from "@/components/animate-photo";
import { AthletesView } from "@/components/athletes-view";
import { TemplatesView } from "@/components/templates-view";
import { AnalyticsView } from "@/components/analytics-view";
import { SettingsPanel } from "@/components/settings-panel";
import { JobQueues } from "@/components/job-queues";
import { AthleteModal } from "@/components/athlete-modal";
import { TemplateModal } from "@/components/template-modal";
import { AthleteDetailModal } from "@/components/athlete-detail-modal";
import { BrandsView } from "@/components/brands-view";
import { BrandModal } from "@/components/brand-modal";

const ACCESS_TOKEN = "no-auth";

const StudioInner = () => {
  const { toast } = useToast();
  const [data, setData] = useState<DashboardBootstrap | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState<ViewId>("generate");
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [athleteModalOpen, setAthleteModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [selectedAthleteDetail, setSelectedAthleteDetail] = useState<Athlete | null>(null);

  const fetchBootstrap = useCallback(async () => {
    try {
      const response = await fetch("/api/bootstrap", {
        headers: { Authorization: `Bearer ${ACCESS_TOKEN}` }
      });
      const payload = (await response.json()) as { data?: DashboardBootstrap; error?: string };
      if (!response.ok || !payload.data) throw new Error(payload.error ?? "Failed to load.");
      setData(payload.data);
    } catch {
      toast("Unable to load dashboard data.", "error");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void fetchBootstrap();
  }, [fetchBootstrap]);

  const handleJobCreated = (job: Job) => {
    setData((prev) => {
      if (!prev) return prev;
      // If job already exists, update it; otherwise prepend
      const exists = prev.jobs.some((j) => j.id === job.id);
      if (exists) {
        return { ...prev, jobs: prev.jobs.map((j) => j.id === job.id ? job : j) };
      }
      return { ...prev, jobs: [job, ...prev.jobs] };
    });
  };

  const handleJobUpdate = (updated: Job) => {
    setData((prev) => prev ? { ...prev, jobs: prev.jobs.map((j) => j.id === updated.id ? updated : j) } : prev);
  };

  const handleJobsCreated = (newJobs: Job[]) => {
    setData((prev) => prev ? { ...prev, jobs: [...newJobs, ...prev.jobs] } : prev);
  };

  const handleAthleteCreated = (athlete: Athlete) => {
    setData((prev) => prev ? { ...prev, athletes: [athlete, ...prev.athletes] } : prev);
  };

  const handleTemplateCreated = (template: Template) => {
    setData((prev) => prev ? { ...prev, templates: [template, ...prev.templates] } : prev);
  };

  const handleAthleteDeleted = (id: string) => {
    setData((prev) => prev ? { ...prev, athletes: prev.athletes.filter((a) => a.id !== id) } : prev);
  };

  const handleAthleteUpdated = (updated: Athlete) => {
    setData((prev) => prev ? { ...prev, athletes: prev.athletes.map((a) => a.id === updated.id ? updated : a) } : prev);
    setSelectedAthleteDetail(updated);
  };

  const handleBrandCreated = () => {
    void fetchBootstrap();
  };

  const pollForCompletion = async (jobId: string) => {
    const maxPolls = 60; // 60 x 10s = 10 minutes
    for (let i = 0; i < maxPolls; i++) {
      await new Promise((r) => setTimeout(r, 10000));
      try {
        const res = await fetch(`/api/jobs/${jobId}/status`);
        const job = (await res.json()) as Job & {
          progress?: number | null;
          _runway?: { progress?: number | null };
        };
        if (job.status === "completed" || job.status === "approved") {
          handleJobCreated(job as Job);
          toast("Video ready!", "success");
          return;
        }
        if (job.status === "failed") {
          handleJobCreated(job as Job);
          toast(`Generation failed: ${job.error_message || "Unknown error"}`, "error");
          return;
        }
        handleJobCreated(job as Job);
        const elapsed = (i + 1) * 10;
        const rawProgress =
          typeof job.progress === "number"
            ? job.progress
            : typeof job._runway?.progress === "number"
              ? job._runway.progress
              : null;
        if (rawProgress !== null) {
          const normalized = rawProgress <= 1 ? rawProgress * 100 : rawProgress;
          const progressPercent = Math.max(0, Math.min(100, Math.round(normalized)));
          toast(`Generating with Runway... (${progressPercent}% • ${elapsed}s elapsed)`, "info");
        } else {
          toast(`Generating with Runway... (${elapsed}s elapsed)`, "info");
        }
      } catch {
        // network error — keep trying
      }
    }
    toast("Timed out waiting for video. Check job queue.", "error");
  };

  const handleRegenerate = (athleteId: string, templateId: string) => {
    void (async () => {
      try {
        const res = await fetch("/api/jobs/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${ACCESS_TOKEN}` },
          body: JSON.stringify({ athleteId, templateId })
        });
        const payload = await res.json();
        if (!res.ok || !payload.data) {
          throw new Error(payload.error ?? "Re-generation failed.");
        }
        handleJobCreated(payload.data as Job);

        if (payload.polling && payload.data.id) {
          toast("Video generating with Runway... (2-4 minutes)", "info");
          await pollForCompletion(payload.data.id);
        } else {
          toast("Re-generation completed.", "success");
        }
      } catch (err) {
        toast(err instanceof Error ? err.message : "Re-generation failed.", "error");
      }
    })();
  };

  if (loading || !data) {
    return (
      <div className="flex h-screen items-center justify-center bg-[var(--bg-darkest)]">
        <p className="text-sm text-secondary">Loading Content Studio…</p>
      </div>
    );
  }

  const queueInitialTab =
    activeView === "approval-queue" ? ("approval" as const) :
    activeView === "review-queue" ? ("review" as const) :
    ("all" as const);

  const renderCenter = () => {
    switch (activeView) {
      case "generate":
        return (
          <GenerateView
            athletes={data.athletes}
            templates={data.templates}
            jobs={data.jobs}
            accessToken={ACCESS_TOKEN}
            onJobCreated={handleJobCreated}
          />
        );
      case "chat":
        return (
          <ChatAssistant
            athletes={data.athletes}
            templates={data.templates}
            accessToken={ACCESS_TOKEN}
            onJobCreated={handleJobCreated}
          />
        );
      case "text-to-video":
        return (
          <TextToVideo
            athletes={data.athletes}
            accessToken={ACCESS_TOKEN}
            onJobCreated={handleJobCreated}
          />
        );
      case "animate-photo":
        return (
          <AnimatePhoto
            athletes={data.athletes}
            accessToken={ACCESS_TOKEN}
            onJobCreated={handleJobCreated}
          />
        );
      case "athletes":
        return (
          <AthletesView
            athletes={data.athletes}
            accessToken={ACCESS_TOKEN}
            onAddAthlete={() => setAthleteModalOpen(true)}
            onSelectAthlete={(a) => setSelectedAthleteDetail(a)}
            onAthleteDeleted={handleAthleteDeleted}
          />
        );
      case "brands":
        return <BrandsView accessToken={ACCESS_TOKEN} onAddBrand={() => setBrandModalOpen(true)} />;
      case "templates":
        return <TemplatesView templates={data.templates} onAddTemplate={() => setTemplateModalOpen(true)} />;
      case "all-jobs":
      case "approval-queue":
      case "review-queue":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">
                {activeView === "approval-queue" ? "Approval Queue" : activeView === "review-queue" ? "Review Queue" : "All Jobs"}
              </h2>
              <p className="text-sm text-secondary mt-1">Manage video production pipeline and QC.</p>
            </div>
            <JobQueues
              key={activeView}
              jobs={data.jobs}
              settings={data.settings}
              accessToken={ACCESS_TOKEN}
              onJobUpdate={handleJobUpdate}
              onJobsCreated={handleJobsCreated}
              onRegenerate={handleRegenerate}
              initialTab={queueInitialTab}
            />
          </div>
        );
      case "analytics":
        return <AnalyticsView jobs={data.jobs} />;
      case "settings":
        return (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Settings</h2>
              <p className="text-sm text-secondary mt-1">Configure API keys, pipeline thresholds, and system info.</p>
            </div>
            <SettingsPanel accessToken={ACCESS_TOKEN} onClose={() => setActiveView("generate")} />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[var(--bg-darkest)]">
      {/* Left Sidebar */}
      <Sidebar
        activeView={activeView}
        onNavigate={setActiveView}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        jobs={data.jobs}
        athleteCount={data.athletes.length}
        templateCount={data.templates.length}
        onAddAthlete={() => setAthleteModalOpen(true)}
        onAddTemplate={() => setTemplateModalOpen(true)}
      />

      {/* Center Panel */}
      <main className="flex-1 overflow-y-auto">
        <div className="flex items-center justify-end border-b border-[var(--border-subtle)] px-4 py-2">
          {!rightPanelOpen && (
            <button
              type="button"
              onClick={() => setRightPanelOpen(true)}
              className="rounded p-1.5 text-secondary hover:text-white"
              title="Show API monitor"
            >
              <PanelRight className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="p-6">{renderCenter()}</div>
      </main>

      {/* Right Panel */}
      {rightPanelOpen && (
        <ApiMonitor
          settings={data.settings}
          jobs={data.jobs}
          accessToken={ACCESS_TOKEN}
          onClose={() => setRightPanelOpen(false)}
        />
      )}

      {/* Modals */}
      {athleteModalOpen && (
        <AthleteModal
          accessToken={ACCESS_TOKEN}
          onClose={() => setAthleteModalOpen(false)}
          onCreated={handleAthleteCreated}
        />
      )}
      {templateModalOpen && (
        <TemplateModal
          accessToken={ACCESS_TOKEN}
          onClose={() => setTemplateModalOpen(false)}
          onCreated={handleTemplateCreated}
        />
      )}
      {brandModalOpen && (
        <BrandModal
          accessToken={ACCESS_TOKEN}
          onClose={() => setBrandModalOpen(false)}
          onCreated={handleBrandCreated}
        />
      )}
      {selectedAthleteDetail && (
        <AthleteDetailModal
          athlete={selectedAthleteDetail}
          accessToken={ACCESS_TOKEN}
          onClose={() => setSelectedAthleteDetail(null)}
          onUpdated={handleAthleteUpdated}
        />
      )}
    </div>
  );
};

export const AICStudioLayout = () => (
  <ToastProvider>
    <StudioInner />
  </ToastProvider>
);
