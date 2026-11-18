import React, { useState } from "react";
import {
  Activity,
  CheckCircle2,
  XCircle,
  Trash2,
  Copy,
  Check,
  Search,
  Terminal,
} from "lucide-react";
import { LogEntry } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { SmtpLogViewer } from "../common/SmtpLogViewer";
import { cn } from "../../lib/utils";
import { ViewShell, ViewToolbar, ViewEmptyState } from "../layout/PageContainer";

interface DiagnosticsViewProps {
  logs: LogEntry[];
  onClearLogs: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  logs,
  onClearLogs,
}) => {
  const [filter, setFilter] = useState<"all" | "success" | "error">("all");
  const [search, setSearch] = useState("");
  const [selectedLogId, setSelectedLogId] = useState<string | null>(
    logs[0]?.id || null
  );
  const [copied, setCopied] = useState(false);

  const filteredLogs = logs.filter((l) => {
    if (filter === "success" && !l.ok) return false;
    if (filter === "error" && l.ok) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        l.msg.toLowerCase().includes(q) ||
        l.server.toLowerCase().includes(q) ||
        (l.log && l.log.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const activeEntry = logs.find((l) => l.id === selectedLogId) || filteredLogs[0];

  const copyActiveLog = () => {
    if (!activeEntry?.log) return;
    navigator.clipboard.writeText(activeEntry.log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-background">
      {/* Left List of Diagnostic Runs */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        {/* Filter & Search Bar */}
        <div className="space-y-2.5 border-b border-border bg-muted/40 p-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter protocol traces…"
                className="h-8 w-full rounded-lg border border-border bg-background pr-3 pl-8 text-[13px] text-foreground shadow-sm transition-colors outline-none placeholder:text-muted-foreground focus:border-emerald-500 focus:bg-card"
              />
            </div>
            {logs.length > 0 && (
              <Button
                size="icon"
                variant="ghost"
                onClick={onClearLogs}
                className="size-8 shrink-0 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                title="Clear protocol logs"
                aria-label="Clear protocol logs"
              >
                <Trash2 className="size-3.5" />
              </Button>
            )}
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center rounded-lg border border-border bg-muted p-1 text-xs font-semibold">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center transition-colors",
                filter === "all"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter("success")}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center transition-colors",
                filter === "success"
                  ? "bg-card text-emerald-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Passed ({logs.filter((l) => l.ok).length})
            </button>
            <button
              onClick={() => setFilter("error")}
              className={cn(
                "flex-1 rounded-md py-1.5 text-center transition-colors",
                filter === "error"
                  ? "bg-card text-red-900 shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              Failed ({logs.filter((l) => !l.ok).length})
            </button>
          </div>
        </div>

        {/* Trace List */}
        <div className="flex-1 space-y-2 overflow-y-auto p-3">
          {filteredLogs.length === 0 ? (
            <div className="px-4 py-16 text-center text-zinc-400">
              <Terminal className="mx-auto mb-2 size-8 text-zinc-300" strokeWidth={1.5} />
              <p className="text-sm font-semibold text-zinc-700">No protocol logs</p>
              <p className="mt-1 text-xs text-zinc-400">
                Test a server or dispatch an email to record transaction handshakes.
              </p>
            </div>
          ) : (
            filteredLogs.map((entry) => {
              const isSelected = activeEntry?.id === entry.id;
              return (
                <div
                  key={entry.id}
                  onClick={() => setSelectedLogId(entry.id)}
                  className={cn(
                    "cursor-pointer rounded-xl border p-3 text-sm transition-all",
                    isSelected
                      ? "border-emerald-300 bg-emerald-50/70 shadow-sm"
                      : "border-border bg-card hover:border-zinc-300 hover:bg-muted/50"
                  )}
                >
                  <div className="mb-1 flex items-center justify-between">
                    <div className="flex min-w-0 items-center gap-2">
                      {entry.ok ? (
                        <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="size-4 shrink-0 text-red-600" />
                      )}
                      <span className="text-xs font-bold tracking-wider text-zinc-900 uppercase">
                        {entry.action === "send" ? "DISPATCH" : "PING"}
                      </span>
                      <span className="truncate font-mono text-xs text-zinc-500">
                        {entry.server}
                      </span>
                    </div>
                    <span className="shrink-0 font-mono text-xs text-zinc-400">
                      {entry.time}
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-xs text-zinc-600">
                    {entry.msg}
                  </p>
                  {entry.duration && (
                    <div className="mt-1.5 flex items-center justify-between font-mono text-xs text-zinc-500">
                      <span>Latency</span>
                      <span className="font-bold text-zinc-700">
                        {entry.duration}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Column: Full Protocol Inspector Pane */}
      {activeEntry ? (
        <ViewShell>
          {/* Inspector Topbar */}
          <ViewToolbar>
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
                  activeEntry.ok
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                )}
              >
                {activeEntry.ok ? "250" : "ERR"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-bold text-foreground">
                    {activeEntry.action === "send"
                      ? "SMTP Email Delivery Run"
                      : "SMTP Ping Handshake"}
                  </h3>
                  <Badge
                    variant={activeEntry.ok ? "default" : "destructive"}
                    className={cn(
                      "px-2 py-0.5 text-xs font-semibold",
                      activeEntry.ok
                        ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                        : ""
                    )}
                  >
                    {activeEntry.ok ? "Success" : "Failed"}
                  </Badge>
                </div>
                <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                  Route: {activeEntry.server} • {activeEntry.time}
                  {activeEntry.duration ? ` (${activeEntry.duration})` : ""}
                </p>
              </div>
            </div>

            {activeEntry.log && (
              <Button
                size="sm"
                variant="outline"
                onClick={copyActiveLog}
                className="h-8 border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/50"
              >
                {copied ? (
                  <>
                    <Check className="mr-1.5 size-4 text-emerald-600" />
                    <span className="font-bold text-emerald-700">
                      Copied Transcript
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="mr-1.5 size-4" />
                    <span>Copy Raw Transcript</span>
                  </>
                )}
              </Button>
            )}
          </ViewToolbar>

          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto bg-zinc-950 p-6 selection:bg-emerald-800">
            {activeEntry.log ? (
              <SmtpLogViewer log={activeEntry.log} />
            ) : (
              <div className="py-16 text-center text-zinc-400">
                <p className="text-sm">No extended raw transcript available for this transaction.</p>
                <p className="mt-1 text-xs text-zinc-500">
                  Summary: {activeEntry.msg}
                </p>
              </div>
            )}
          </div>
        </ViewShell>
      ) : (
        <ViewShell>
          <ViewEmptyState
            icon={Activity}
            title={
              logs.length === 0
                ? "No protocol traces recorded"
                : "Select a transaction from the left"
            }
            description={
              logs.length === 0
                ? "Test a server connection or dispatch an email to stream raw SMTP commands and response codes."
                : "Click any transaction from the list on the left to inspect raw SMTP handshakes."
            }
          />
        </ViewShell>
      )}
    </div>
  );
};
