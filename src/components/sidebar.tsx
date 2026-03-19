"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Sparkles,
  Users,
  LayoutTemplate,
  ListChecks,
  Settings,
  Menu,
  X,
  Film,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/generate", label: "Generate", icon: Sparkles, primary: true },
  { href: "/athletes", label: "Athletes", icon: Users },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/queue", label: "Queue", icon: ListChecks },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed left-4 top-4 z-50 rounded-lg bg-brand-card p-2 text-gray-400 lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-screen w-64 flex-col border-r border-white/5 bg-brand-bg transition-transform duration-300 lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-6 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-accent">
            <Film className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white">AiC Studio</h1>
            <p className="text-[10px] uppercase tracking-widest text-gray-500">
              Content Studio
            </p>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="ml-auto rounded-lg p-1 text-gray-400 hover:text-white lg:hidden"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-brand-accent/10 text-brand-accent"
                    : "text-gray-400 hover:bg-white/5 hover:text-white",
                  item.primary &&
                    !isActive &&
                    "text-brand-accent hover:bg-brand-accent/10"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    item.primary && !isActive && "text-brand-accent"
                  )}
                />
                {item.label}
                {item.primary && (
                  <span className="ml-auto rounded-md bg-brand-accent/20 px-1.5 py-0.5 text-[10px] font-semibold text-brand-accent">
                    NEW
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/5 px-4 py-4">
          <div className="rounded-lg bg-white/5 p-3">
            <p className="text-xs font-medium text-gray-400">Athletes in Control</p>
            <p className="mt-0.5 text-[10px] text-gray-500">
              AI Video Production Platform
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
