"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivitySquare,
  ClipboardList,
  LayoutDashboard,
  Menu,
  Settings,
  Sparkles,
  Users,
  X
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Generate", href: "/generate", icon: Sparkles, primary: true },
  { label: "Athletes", href: "/athletes", icon: Users },
  { label: "Templates", href: "/templates", icon: ActivitySquare },
  { label: "Queue", href: "/queue", icon: ClipboardList },
  { label: "Settings", href: "/settings", icon: Settings }
];

export function AppSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        className="fixed left-4 top-4 z-40 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border bg-card text-slate-100 md:hidden"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-slate-950/70 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-label="Close menu overlay"
        />
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-72 border-r border-border bg-card px-5 py-6 transition-transform md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Athletes in Control</p>
            <h1 className="text-xl font-semibold text-slate-100">AiC Content Studio</h1>
          </div>
          <button
            type="button"
            className="rounded-lg p-2 text-slate-300 hover:bg-muted md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition",
                  item.primary
                    ? "bg-accent/20 text-[#9FD0FF] hover:bg-accent/30"
                    : "text-slate-300 hover:bg-slate-800/70 hover:text-slate-100",
                  active && "ring-1 ring-accent/60"
                )}
                onClick={() => setMobileOpen(false)}
              >
                <Icon className={cn("h-4 w-4", item.primary && "text-[#9FD0FF]")} />
                <span>{item.label}</span>
                {item.primary ? (
                  <span className="ml-auto rounded-full bg-accent px-2 py-0.5 text-[10px] text-white">
                    Primary
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
