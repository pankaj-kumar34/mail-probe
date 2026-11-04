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
import { parseSmtpLog } from "../../lib/smtpParser";
import { cn } from "../../lib/utils";

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
  const parsedActiveLog = activeEntry?.log ? parseSmtpLog(activeEntry.log) : [];

  const copyActiveLog = () => {
    if (!activeEntry?.log) return;
    navigator.clipboard.writeText(activeEntry.log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-zinc-50/50">
      {/* Left List of Diagnostic Runs */}
      <div className="w-80 border-r border-border bg-white flex flex-col shrink-0">
        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-border bg-zinc-50/60 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-600" />
              <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
                Protocol Streams
              </span>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold">
                {logs.length}
              </Badge>
            </div>
            {logs.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                onClick={onClearLogs}
                className="h-7 px-2.5 text-xs text-zinc-500 hover:text-red-600"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                <span>Clear</span>
              </Button>
            )}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter protocol traces…"
              className="w-full h-10 pl-9 pr-3 rounded-lg border border-border bg-white text-sm text-zinc-800 outline-none placeholder:text-zinc-400 focus:border-emerald-500 shadow-2xs"
            />
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center bg-zinc-200/70 p-1 rounded-lg border border-border text-xs font-semibold">
            <button
              onClick={() => setFilter("all")}
              className={cn(
                "flex-1 py-1.5 rounded-md transition-colors text-center",
                filter === "all"
                  ? "bg-white text-zinc-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter("success")}
              className={cn(
                "flex-1 py-1.5 rounded-md transition-colors text-center",
                filter === "success"
                  ? "bg-white text-emerald-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              Passed ({logs.filter((l) => l.ok).length})
            </button>
            <button
              onClick={() => setFilter("error")}
              className={cn(
                "flex-1 py-1.5 rounded-md transition-colors text-center",
                filter === "error"
                  ? "bg-white text-red-900 shadow-xs"
                  : "text-zinc-600 hover:text-zinc-900"
              )}
            >
              Failed ({logs.filter((l) => !l.ok).length})
            </button>
          </div>
        </div>

        {/* Trace List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredLogs.length === 0 ? (
            <div className="py-16 px-4 text-center text-zinc-400">
              <Terminal className="w-8 h-8 mx-auto mb-2 text-zinc-300 stroke-[1.5]" />
              <p className="text-sm font-semibold text-zinc-700">No protocol logs</p>
              <p className="text-xs text-zinc-400 mt-1">
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
                    "p-3 rounded-xl border text-sm cursor-pointer transition-all",
                    isSelected
                      ? "bg-emerald-50/70 border-emerald-300 shadow-xs"
                      : "bg-white border-border hover:border-zinc-300 hover:bg-zinc-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      {entry.ok ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 shrink-0" />
                      )}
                      <span className="font-bold text-zinc-900 uppercase text-xs tracking-wider">
                        {entry.action === "send" ? "DISPATCH" : "PING"}
                      </span>
                      <span className="text-xs text-zinc-500 font-mono truncate">
                        {entry.server}
                      </span>
                    </div>
                    <span className="text-xs text-zinc-400 font-mono shrink-0">
                      {entry.time}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-600 font-mono truncate mt-1">
                    {entry.msg}
                  </p>
                  {entry.duration && (
                    <div className="mt-1.5 flex items-center justify-between text-xs text-zinc-500 font-mono">
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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-white">
          {/* Inspector Topbar */}
          <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-zinc-50/60 shrink-0">
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-lg flex items-center justify-center font-bold text-xs shrink-0",
                  activeEntry.ok
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-red-100 text-red-800"
                )}
              >
                {activeEntry.ok ? "250" : "ERR"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-zinc-900">
                    {activeEntry.action === "send"
                      ? "SMTP Email Delivery Run"
                      : "SMTP Ping Handshake"}
                  </h3>
                  <Badge
                    variant={activeEntry.ok ? "default" : "destructive"}
                    className={cn(
                      "text-xs px-2 py-0.5 font-semibold",
                      activeEntry.ok
                        ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                        : ""
                    )}
                  >
                    {activeEntry.ok ? "Success" : "Failed"}
                  </Badge>
                </div>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
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
                className="h-9 px-3.5 text-xs font-semibold bg-white text-zinc-800 hover:bg-zinc-50 border-border"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 mr-1.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">
                      Copied Transcript
                    </span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-1.5" />
                    <span>Copy Raw Transcript</span>
                  </>
                )}
              </Button>
            )}
          </div>

          {/* Transcript Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-zinc-950 font-mono text-sm text-zinc-200 leading-relaxed selection:bg-emerald-800">
            {parsedActiveLog.length > 0 ? (
              <div className="space-y-1.5">
                {parsedActiveLog.map((line, idx) => (
                  <div
                    key={idx}
                    className={cn(
                      "flex items-start gap-3 py-1 px-2.5 rounded hover:bg-zinc-900 transition-colors",
                      line.direction === "client" && "text-cyan-400 font-medium",
                      line.direction === "server" &&
                        (line.code?.startsWith("5")
                          ? "text-red-400 font-bold bg-red-950/20"
                          : line.code?.startsWith("2")
                          ? "text-emerald-400"
                          : "text-amber-300"),
                      line.direction === "error" &&
                        "text-red-400 font-bold bg-red-950/30",
                      line.direction === "system" && "text-zinc-400 italic"
                    )}
                  >
                    <span className="w-8 shrink-0 text-zinc-600 text-right select-none text-xs">
                      {idx + 1}
                    </span>
                    <span className="font-bold select-none text-zinc-500 w-3 shrink-0">
                      {line.direction === "client"
                        ? ">"
                        : line.direction === "server"
                        ? "<"
                        : "•"}
                    </span>
                    <span className="flex-1 break-all">{line.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-zinc-400 py-16 text-center">
                <p className="text-sm">No extended raw transcript available for this transaction.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Summary: {activeEntry.msg}
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
            <Activity className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800">
            {logs.length === 0 ? "No protocol traces recorded" : "Select a transaction from the left"}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mt-1">
            {logs.length === 0
              ? "Test a server connection or dispatch an email to stream raw SMTP commands and response codes."
              : "Click any transaction from the list on the left to inspect raw SMTP handshakes."}
          </p>
        </div>
      )}
    </div>
  );
};
