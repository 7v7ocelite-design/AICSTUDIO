"use client";

import { SIDEBAR_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  LayoutTemplate,
  ListChecks,
  Menu,
  Settings,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useMemo, useState } from "react";

const iconMap = {
  LayoutDashboard,
  Sparkles,
  Users,
  LayoutTemplate,
  ListChecks,
  Settings,
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = useMemo(
    () => (href: string) => pathname === href || pathname.startsWith(`${href}/`),
    [pathname],
  );

  return (
    <div className="min-h-screen bg-[#0F172A] text-slate-100">
      <div className="lg:hidden border-b border-slate-700/70 px-4 py-3 flex items-center justify-between">
        <p className="text-xl font-extrabold tracking-wide">AiC</p>
        <button
          type="button"
          className="rounded-md border border-slate-600 p-2"
          onClick={() => setOpen((prev) => !prev)}
          aria-label="Toggle menu"
        >
          {open ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      <div className="flex">
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 transform border-r border-slate-700/70 bg-[#111B31] p-4 transition-transform lg:static lg:translate-x-0",
            open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          )}
        >
          <div className="mb-8 hidden lg:flex items-center justify-between">
            <p className="text-xl font-extrabold tracking-wide text-white">AiC</p>
          </div>
          <nav className="space-y-1">
            {SIDEBAR_ITEMS.map((item) => {
              const Icon = iconMap[item.icon];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    isActive(item.href)
                      ? "bg-[#2E75B6] text-white"
                      : "text-slate-300 hover:bg-slate-800/90 hover:text-white",
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>
        {open ? (
          <button
            aria-label="Close sidebar overlay"
            className="fixed inset-0 z-30 bg-black/40 lg:hidden"
            onClick={() => setOpen(false)}
            type="button"
          />
        ) : null}
        <main className="min-h-screen flex-1 px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
