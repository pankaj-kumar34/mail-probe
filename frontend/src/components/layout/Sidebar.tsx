import React from "react";
import {
  Mail,
  Server,
  Activity,
  FileText,
  Bookmark,
  History,
} from "lucide-react";
import { View } from "../../types";
import { cn } from "../../lib/utils";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  serverCount: number;
  templateCount: number;
  snippetCount: number;
  historyCount: number;
  logCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  serverCount,
  templateCount,
  snippetCount,
  historyCount,
  logCount,
}) => {
  const navItems = [
    {
      id: "compose" as View,
      label: "Compose Email",
      icon: Mail,
      badge: null,
    },
    {
      id: "servers" as View,
      label: "Servers",
      icon: Server,
      badge: serverCount > 0 ? serverCount : null,
    },
    {
      id: "diagnostics" as View,
      label: "Protocol Inspector",
      icon: Activity,
      badge: logCount > 0 ? logCount : null,
    },
    {
      id: "templates" as View,
      label: "Templates",
      icon: FileText,
      badge: templateCount > 0 ? templateCount : null,
    },
    {
      id: "snippets" as View,
      label: "Snippets",
      icon: Bookmark,
      badge: snippetCount > 0 ? snippetCount : null,
    },
    {
      id: "history" as View,
      label: "Sent History",
      icon: History,
      badge: historyCount > 0 ? historyCount : null,
    },
  ];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-zinc-800 bg-zinc-900 text-zinc-100 select-none">
      {/* Brand Header */}
      <div className="flex h-16 items-center justify-between border-b border-zinc-800/80 px-5">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500 font-bold text-zinc-950 shadow-md shadow-emerald-500/20">
            <Mail className="size-4 text-zinc-950" strokeWidth={2.5} />
          </div>
          <div>
            <span className="block text-sm font-bold tracking-tight text-white">
              Mail Probe
            </span>
            <span className="text-xs font-normal text-zinc-400">
              SMTP Diagnostics
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "group relative flex w-full items-center gap-3 rounded-lg px-3.5 py-2.5 text-left text-sm font-medium transition-all",
                isActive
                  ? "bg-zinc-800 font-semibold text-white shadow-sm"
                  : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200",
              )}
            >
              {isActive && (
                <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-emerald-400" />
              )}
              <Icon
                className={cn(
                  "size-4 shrink-0 transition-colors",
                  isActive
                    ? "text-emerald-400"
                    : "text-zinc-400 group-hover:text-zinc-200",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== null && (
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold",
                    isActive
                      ? "bg-zinc-700 text-zinc-200"
                      : "bg-zinc-800 text-zinc-400",
                  )}
                >
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
};
