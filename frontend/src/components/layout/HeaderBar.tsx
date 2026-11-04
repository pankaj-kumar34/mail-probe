import React, { useState, useRef, useEffect } from "react";
import {
  Server,
  ChevronDown,
  Check,
  Bookmark,
  FileText,
  Plus,
  RotateCw,
} from "lucide-react";
import { ServerProfile, View } from "../../types";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface HeaderBarProps {
  currentView: View;
  profiles: ServerProfile[];
  activeServer?: ServerProfile;
  onSelectServer: (id: string) => void;
  onTestServer?: (server: ServerProfile) => void;
  testingServerId?: string | null;
  testStatus: Record<string, boolean>;
  onToggleDrawer: (tab: "snippets" | "templates") => void;
  isDrawerOpen: boolean;
  drawerTab: "snippets" | "templates" | null;
  onNewEmail?: () => void;
  onAddServer?: () => void;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentView,
  profiles,
  activeServer,
  onSelectServer,
  onTestServer,
  testingServerId,
  testStatus,
  onToggleDrawer,
  isDrawerOpen,
  drawerTab,
  onNewEmail,
  onAddServer,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const viewTitles: Record<View, string> = {
    compose: "Compose Email",
    servers: "Servers",
    diagnostics: "Protocol Inspector",
    templates: "Email Templates",
    snippets: "Snippets Library",
    history: "Delivery History",
  };

  const isTesting = activeServer && testingServerId === activeServer.id;
  const isHealthy = activeServer ? testStatus[activeServer.id] : undefined;

  return (
    <header className="h-16 border-b border-border bg-white px-6 flex items-center justify-between shrink-0 select-none z-10">
      {/* View Title */}
      <div>
        <h1 className="text-base font-bold text-zinc-900 tracking-tight">
          {viewTitles[currentView]}
        </h1>
      </div>

      {/* Right Controls: Server Switcher & Action Center */}
      <div className="flex items-center gap-3">
        {/* Server Picker Dropdown */}
        <div ref={dropdownRef} className="relative">
          <button
            onClick={() => setDropdownOpen((o) => !o)}
            className="flex items-center gap-2.5 h-10 px-3.5 rounded-lg border border-border bg-zinc-50 hover:bg-zinc-100 hover:border-zinc-300 text-sm font-medium text-zinc-800 transition-colors shadow-2xs"
          >
            <Server className="w-4 h-4 text-zinc-500" />
            <div className="flex items-center gap-2 max-w-[200px]">
              <span
                className={cn(
                  "w-2 h-2 rounded-full shrink-0",
                  isTesting
                    ? "bg-amber-400 animate-pulse"
                    : isHealthy === true
                      ? "bg-emerald-500"
                      : isHealthy === false
                        ? "bg-red-500"
                        : "bg-zinc-400",
                )}
              />
              <span className="truncate">
                {activeServer ? activeServer.name : "Select Relay"}
              </span>
            </div>
            {activeServer && (
              <span className="text-xs text-zinc-400 font-mono">
                :{activeServer.port}
              </span>
            )}
            <ChevronDown className="w-4 h-4 text-zinc-400 ml-1" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-border bg-white shadow-xl py-1.5 z-50 animate-scale-in">
              <div className="px-3.5 py-2 border-b border-border flex items-center justify-between">
                <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                  Select Server
                </span>
                {onAddServer && (
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onAddServer();
                    }}
                    className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add New
                  </button>
                )}
              </div>
              <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                {profiles.map((p) => {
                  const isSelected = activeServer?.id === p.id;
                  const ok = testStatus[p.id];
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        onSelectServer(p.id);
                        setDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg flex items-center justify-between text-sm transition-colors",
                        isSelected
                          ? "bg-emerald-50 text-emerald-900 font-semibold"
                          : "hover:bg-zinc-50 text-zinc-800",
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <span
                          className={cn(
                            "w-2 h-2 rounded-full shrink-0",
                            ok === true
                              ? "bg-emerald-500"
                              : ok === false
                                ? "bg-red-500"
                                : "bg-zinc-300",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate font-medium">{p.name}</p>
                          <p className="text-xs text-zinc-400 font-mono truncate">
                            {p.server || "localhost"}:{p.port}
                          </p>
                        </div>
                      </div>
                      {isSelected && (
                        <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Toggles */}
        <div className="flex items-center gap-1 bg-zinc-100 p-1 rounded-lg border border-border">
          <button
            onClick={() => onToggleDrawer("snippets")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
              isDrawerOpen && drawerTab === "snippets"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900",
            )}
            title="Toggle Snippets Drawer"
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Snippets</span>
          </button>
          <button
            onClick={() => onToggleDrawer("templates")}
            className={cn(
              "px-3 py-1.5 rounded-md text-xs font-semibold transition-colors flex items-center gap-1.5",
              isDrawerOpen && drawerTab === "templates"
                ? "bg-white text-zinc-900 shadow-xs"
                : "text-zinc-600 hover:text-zinc-900",
            )}
            title="Toggle Templates Drawer"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Templates</span>
          </button>
        </div>

        {/* New Draft Reset */}
        {currentView === "compose" && onNewEmail && (
          <Button
            variant="ghost"
            size="sm"
            className="h-10 px-3 text-zinc-500 hover:text-zinc-800 text-sm"
            onClick={onNewEmail}
            title="Clear and reset draft"
          >
            <RotateCw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </header>
  );
};
