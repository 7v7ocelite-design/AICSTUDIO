"use client";

import Image from "next/image";
import {
  Clapperboard, UserPlus, FilePlus, Users, Film,
  ClipboardList, CheckCircle2, AlertTriangle,
  BarChart3, Settings, PanelLeftClose, PanelLeftOpen,
  MessageSquare, Type, ImageIcon, Music, Wand2
} from "lucide-react";

import type { Job } from "@/lib/types";

export type ViewId =
  | "generate"
  | "chat"
  | "text-to-video"
  | "animate-photo"
  | "athletes"
  | "templates"
  | "brands"
  | "all-jobs"
  | "approval-queue"
  | "review-queue"
  | "analytics"
  | "settings";

interface SidebarProps {
  activeView: ViewId;
  onNavigate: (view: ViewId) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  jobs: Job[];
  athleteCount: number;
  templateCount: number;
  onAddAthlete: () => void;
  onAddTemplate: () => void;
}

const formatTimeAgo = (dateString: string) => {
  const diff = Date.now() - new Date(dateString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const statusDot: Record<string, string> = {
  approved: "bg-green-accent",
  needs_review: "bg-amber-accent",
  rejected: "bg-red-500",
  generating: "bg-blue-accent",
  scoring: "bg-amber-accent",
  queued: "bg-neutral-500"
};

export const Sidebar = ({
  activeView, onNavigate, collapsed, onToggleCollapse,
  jobs, athleteCount, templateCount, onAddAthlete, onAddTemplate
}: SidebarProps) => {
  const approvalCount = jobs.filter((j) => (j.face_score ?? 0) >= 90 && !["approved", "rejected"].includes(j.status)).length;
  const reviewCount = jobs.filter((j) => {
    const s = j.face_score ?? 0;
    return s >= 85 && s < 90 && !["approved", "rejected"].includes(j.status);
  }).length;
  const recentJobs = jobs.slice(0, 5);
  const todayCount = jobs.filter((j) => {
    const d = new Date(j.created_at);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }).length;

  const navItem = (view: ViewId, icon: React.ReactNode, label: string, badge?: number) => (
    <button
      type="button"
      onClick={() => onNavigate(view)}
      title={collapsed ? label : undefined}
      className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
        activeView === view
          ? "border-l-2 border-l-accent bg-[var(--bg-card)] text-white"
          : "border-l-2 border-l-transparent text-secondary hover:bg-[var(--bg-card)] hover:text-white"
      } ${collapsed ? "justify-center px-0" : ""}`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="flex-1 truncate text-left">{label}</span>}
      {!collapsed && badge !== undefined && badge > 0 && (
        <span className="rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] font-bold text-accent">{badge}</span>
      )}
    </button>
  );

  const actionItem = (icon: React.ReactNode, label: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-secondary transition hover:bg-[var(--bg-card)] hover:text-white ${collapsed ? "justify-center px-0" : ""}`}
    >
      <span className="flex-shrink-0">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  );

  return (
    <aside
      className={`flex flex-col border-r border-[var(--border-subtle)] bg-sidebar transition-all duration-200 ${
        collapsed ? "w-[60px]" : "w-[260px]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-4">
        <Image src="/aic-logo.png" alt="AiC" width={32} height={32} className="h-8 w-8 rounded" />
        {!collapsed && <span className="text-sm font-semibold tracking-tight">Content Studio</span>}
        <button
          type="button"
          onClick={onToggleCollapse}
          className="ml-auto rounded p-1 text-secondary hover:text-white"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {!collapsed && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Quick Actions</p>}
        {navItem("generate", <Clapperboard className="h-4 w-4" />, "New Production")}
        {navItem("chat", <MessageSquare className="h-4 w-4" />, "AI Assistant")}
        {actionItem(<UserPlus className="h-4 w-4" />, "Add Athlete", onAddAthlete)}

        <div className="my-2 border-t border-[var(--border-subtle)]" />
        {!collapsed && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Creative Tools</p>}
        {navItem("text-to-video", <Type className="h-4 w-4" />, "Text-to-Video")}
        {navItem("animate-photo", <ImageIcon className="h-4 w-4" />, "Animate Photo")}
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted opacity-50 cursor-default">
            <Music className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">Audio</span>
            <span className="ml-auto text-[9px] bg-blue-accent/20 text-blue-accent rounded px-1.5 py-0.5">Soon</span>
          </div>
        )}

        <div className="my-2 border-t border-[var(--border-subtle)]" />
        {!collapsed && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Library</p>}
        {navItem("athletes", <Users className="h-4 w-4" />, "Athletes")}
        {navItem("templates", <Film className="h-4 w-4" />, "Templates")}
        {navItem("brands", <Wand2 className="h-4 w-4" />, "Brands")}

        <div className="my-2 border-t border-[var(--border-subtle)]" />
        {!collapsed && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">Production Queue</p>}
        {navItem("all-jobs", <ClipboardList className="h-4 w-4" />, "All Jobs")}
        {navItem("approval-queue", <CheckCircle2 className="h-4 w-4" />, "Approval Queue", approvalCount)}
        {navItem("review-queue", <AlertTriangle className="h-4 w-4" />, "Review Queue", reviewCount)}

        <div className="my-2 border-t border-[var(--border-subtle)]" />
        {!collapsed && <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted">System</p>}
        {navItem("analytics", <BarChart3 className="h-4 w-4" />, "Analytics")}
        {navItem("settings", <Settings className="h-4 w-4" />, "Settings")}
      </nav>

      {/* Recent Jobs */}
      {!collapsed && recentJobs.length > 0 && (
        <div className="border-t border-[var(--border-subtle)] px-3 py-3">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted">Recent</p>
          <div className="space-y-1">
            {recentJobs.map((job) => (
              <button
                key={job.id}
                type="button"
                onClick={() => onNavigate("all-jobs")}
                className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs text-secondary transition hover:bg-[var(--bg-card)] hover:text-white"
              >
                <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${statusDot[job.status] ?? "bg-neutral-500"}`} />
                <span className="flex-1 truncate">{job.athlete?.name ?? "Unknown"} · {job.template?.category ?? ""}</span>
                <span className="flex-shrink-0 text-[10px] text-muted">{formatTimeAgo(job.created_at)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer Stats */}
      {!collapsed && (
        <div className="flex gap-4 border-t border-[var(--border-subtle)] px-4 py-3 text-[10px] text-muted">
          <span>{athleteCount} Athletes</span>
          <span>{templateCount} Templates</span>
          <span>{todayCount} Today</span>
        </div>
      )}
    </aside>
  );
};
