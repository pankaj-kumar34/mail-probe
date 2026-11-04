import React, { useState } from "react";
import {
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trash2,
  Terminal,
  Search,
} from "lucide-react";
import { SentEmail } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

interface HistoryViewProps {
  history: SentEmail[];
  onResend: (sent: SentEmail) => void;
  onClearHistory: () => void;
  onInspectLog?: (log: string) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  history,
  onResend,
  onClearHistory,
  onInspectLog,
}) => {
  const [search, setSearch] = useState("");

  const filteredHistory = history.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      h.email.subject.toLowerCase().includes(q) ||
      h.server.toLowerCase().includes(q) ||
      h.email.to.some((t) => t.toLowerCase().includes(q))
    );
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
      {/* Streamlined Controls Toolbar (No redundant duplicate title) */}
      <div className="h-14 px-8 border-b border-border bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, relay, or recipient…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-zinc-50 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>

          <span className="text-xs font-medium text-zinc-500">
            {filteredHistory.length === history.length
              ? `${history.length} ${history.length === 1 ? "delivery" : "deliveries"}`
              : `Showing ${filteredHistory.length} of ${history.length} deliveries`}
          </span>
        </div>

        {history.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearHistory}
            className="h-8 px-3 text-xs font-semibold text-zinc-500 hover:text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
            <span>Clear History</span>
          </Button>
        )}
      </div>

      {/* History List or Centered Empty State */}
      {filteredHistory.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
            <History className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800">
            {search ? "No matching deliveries" : "No sent emails yet"}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mt-1">
            {search
              ? `No deliveries matched "${search}". Try searching with a different term.`
              : "Dispatched test emails will be recorded here with delivery receipts and queue IDs."}
          </p>
          {search && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSearch("")}
              className="mt-4 text-xs font-semibold"
            >
              Clear search
            </Button>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="max-w-5xl w-full mx-auto space-y-4">
            {filteredHistory.map((item) => {
              const ok = item.result.success;
              const toList = item.email.to.filter(Boolean);

              return (
                <div
                  key={item.id}
                  className="rounded-xl border border-border bg-white shadow-2xs overflow-hidden hover:border-zinc-300 transition-colors"
                >
                  <div className="p-5 flex items-start justify-between gap-5">
                    <div className="flex items-start gap-3.5 min-w-0 flex-1">
                      {ok ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2.5 flex-wrap">
                          <h3 className="text-sm font-bold text-zinc-900 truncate">
                            {item.email.subject || "(No Subject)"}
                          </h3>
                          <Badge
                            variant={ok ? "default" : "destructive"}
                            className={cn(
                              "text-xs px-2 py-0.5 font-semibold",
                              ok
                                ? "bg-emerald-100 text-emerald-800 border-emerald-200"
                                : ""
                            )}
                          >
                            {ok ? "Delivered" : "Failed"}
                          </Badge>
                        </div>

                        <p className="text-sm text-zinc-700 font-mono truncate mt-1.5">
                          To: {toList.join(", ") || "(empty)"}
                        </p>

                        <div className="flex items-center gap-5 mt-2.5 text-xs text-zinc-500 flex-wrap font-medium">
                          <span>
                            <strong className="text-zinc-700">Relay:</strong>{" "}
                            {item.server}
                          </span>
                          <span>
                            <strong className="text-zinc-700">Sent:</strong>{" "}
                            {new Date(item.sentAt).toLocaleString()}
                          </span>
                          {item.result.duration && (
                            <span className="text-emerald-700 font-bold font-mono">
                              ⚡ {item.result.duration}
                            </span>
                          )}
                          {item.result.queueId && (
                            <span className="font-mono text-zinc-700">
                              Queue ID: <code>{item.result.queueId}</code>
                            </span>
                          )}
                          {item.email.attachments?.length > 0 && (
                            <span className="text-amber-700 font-semibold">
                              📎 {item.email.attachments.length} files
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2.5 shrink-0">
                      {item.result.log && onInspectLog && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onInspectLog(item.result.log!)}
                          className="h-9 px-3.5 text-xs font-semibold bg-white text-zinc-800 hover:bg-zinc-50 border-border"
                        >
                          <Terminal className="w-4 h-4 mr-1.5 text-zinc-500" />
                          <span>Inspect Trace</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onResend(item)}
                        className="h-9 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      >
                        <RotateCcw className="w-4 h-4 mr-1.5" />
                        <span>Re-send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
