import React from "react";
import {
  Mail,
  Server,
  Activity,
  FileText,
  Bookmark,
  History,
  ChevronRight,
} from "lucide-react";
import { View, ServerProfile } from "../../types";
import { cn } from "../../lib/utils";

interface SidebarProps {
  currentView: View;
  onViewChange: (view: View) => void;
  activeServer?: ServerProfile;
  serverCount: number;
  templateCount: number;
  snippetCount: number;
  historyCount: number;
  logCount: number;
  testStatus: Record<string, boolean>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  activeServer,
  serverCount,
  templateCount,
  snippetCount,
  historyCount,
  logCount,
  testStatus,
}) => {
  const isServerTested = activeServer ? testStatus[activeServer.id] : undefined;

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
    <aside className="w-64 bg-zinc-900 text-zinc-100 flex flex-col shrink-0 border-r border-zinc-800 select-none">
      {/* Brand Header */}
      <div className="h-16 px-5 flex items-center justify-between border-b border-zinc-800/80">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 flex items-center justify-center text-zinc-950 font-bold shadow-md shadow-emerald-500/20">
            <Mail className="w-4 h-4 text-zinc-950 stroke-[2.5]" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-white block">
              Mail Probe
            </span>
            <span className="text-xs text-zinc-400 font-normal">
              SMTP Diagnostics
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all group relative text-left",
                isActive
                  ? "bg-zinc-800 text-white font-semibold shadow-xs"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40",
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-emerald-400 rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-colors",
                  isActive
                    ? "text-emerald-400"
                    : "text-zinc-400 group-hover:text-zinc-200",
                )}
              />
              <span className="flex-1 truncate">{item.label}</span>
              {item.badge !== null && (
                <span
                  className={cn(
                    "text-xs font-semibold px-2 py-0.5 rounded-full shrink-0",
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

      {/* Active Server in Footer */}
      <div className="p-3 border-t border-zinc-800/80">
        <button
          type="button"
          onClick={() => onViewChange("servers")}
          className="w-full flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700/80 transition-colors text-left group"
          title={
            activeServer
              ? `${activeServer.name} (${activeServer.server}:${activeServer.port}) • ${
                  isServerTested === true
                    ? "Connected"
                    : isServerTested === false
                      ? "Offline"
                      : "Untested"
                }`
              : "Select a server"
          }
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <span
              className={cn(
                "w-2 h-2 rounded-full shrink-0",
                isServerTested === true
                  ? "bg-emerald-400"
                  : isServerTested === false
                    ? "bg-rose-400"
                    : "bg-zinc-500",
              )}
            />
            <span className="text-xs font-medium text-zinc-300 group-hover:text-white truncate">
              {activeServer ? activeServer.name : "Select server"}
            </span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-zinc-300 transition-transform group-hover:translate-x-0.5 shrink-0" />
        </button>
      </div>
    </aside>
  );
};
