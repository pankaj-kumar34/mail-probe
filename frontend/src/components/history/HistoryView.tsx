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
import {
  ViewShell,
  ViewToolbar,
  ViewContent,
  ViewEmptyState,
} from "../layout/PageContainer";

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
    <ViewShell>
      {/* Streamlined Controls Toolbar */}
      <ViewToolbar>
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by subject, relay, or recipient…"
              className="h-8 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-[13px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-emerald-500 focus:bg-card"
            />
          </div>

          <span className="text-xs font-medium text-muted-foreground">
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
            className="h-8 px-3 text-xs font-semibold text-muted-foreground hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="mr-1.5 size-3.5" />
            <span>Clear History</span>
          </Button>
        )}
      </ViewToolbar>

      {/* History List or Centered Empty State */}
      {filteredHistory.length === 0 ? (
        <ViewEmptyState
          icon={History}
          title={search ? "No matching deliveries" : "No sent emails yet"}
          description={
            search
              ? `No deliveries matched "${search}". Try searching with a different term.`
              : "Dispatched test emails will be recorded here with delivery receipts and queue IDs."
          }
          action={
            search ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSearch("")}
                className="h-9 px-4 text-xs font-semibold"
              >
                Clear search
              </Button>
            ) : undefined
          }
        />
      ) : (
        <ViewContent maxWidth="6xl" className="space-y-4">
            {filteredHistory.map((item) => {
              const ok = item.result.success;
              const toList = item.email.to.filter(Boolean);

              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-colors hover:border-zinc-300"
                >
                  <div className="flex items-start justify-between gap-5 p-5">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      {ok ? (
                        <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
                      ) : (
                        <XCircle className="mt-0.5 size-6 shrink-0 text-red-600" />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2.5">
                          <h3 className="truncate text-[13px] font-bold text-foreground">
                            {item.email.subject || "(No Subject)"}
                          </h3>
                          <Badge
                            variant={ok ? "default" : "destructive"}
                            className={cn(
                              "px-2 py-0.5 text-xs font-semibold",
                              ok
                                ? "border-emerald-200 bg-emerald-100 text-emerald-800"
                                : ""
                            )}
                          >
                            {ok ? "Delivered" : "Failed"}
                          </Badge>
                        </div>

                        <p className="mt-1.5 truncate font-mono text-xs text-muted-foreground">
                          To: {toList.join(", ") || "(empty)"}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-5 text-xs font-medium text-zinc-500">
                          <span>
                            <strong className="text-zinc-700">Relay:</strong>{" "}
                            {item.server}
                          </span>
                          <span>
                            <strong className="text-zinc-700">Sent:</strong>{" "}
                            {new Date(item.sentAt).toLocaleString()}
                          </span>
                          {item.result.duration && (
                            <span className="font-mono font-bold text-emerald-700">
                              ⚡ {item.result.duration}
                            </span>
                          )}
                          {item.result.queueId && (
                            <span className="font-mono text-zinc-700">
                              Queue ID: <code>{item.result.queueId}</code>
                            </span>
                          )}
                          {item.email.attachments?.length > 0 && (
                            <span className="font-semibold text-amber-700">
                              📎 {item.email.attachments.length} files
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2.5">
                      {item.result.log && onInspectLog && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onInspectLog(item.result.log!)}
                          className="h-8 border-border bg-card px-3 text-xs font-semibold text-foreground hover:bg-muted/50"
                        >
                          <Terminal className="mr-1.5 size-3.5 text-muted-foreground" />
                          <span>Inspect Trace</span>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        onClick={() => onResend(item)}
                        className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                      >
                        <RotateCcw className="mr-1.5 size-3.5" />
                        <span>Re-send</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </ViewContent>
      )}
    </ViewShell>
  );
};
