import React, { useState } from "react";
import { X, Copy, Check, Terminal } from "lucide-react";
import { Button } from "../ui/button";
import { parseSmtpLog } from "../../lib/smtpParser";
import { cn } from "../../lib/utils";

interface SmtpInspectorModalProps {
  log: string | null;
  onClose: () => void;
}

export const SmtpInspectorModal: React.FC<SmtpInspectorModalProps> = ({
  log,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);

  if (!log) return null;

  const parsedLog = parseSmtpLog(log);

  const copyLog = () => {
    navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-900/50 backdrop-blur-xs animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-zinc-950 rounded-2xl shadow-2xl border border-zinc-800 w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in text-zinc-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="h-16 px-6 border-b border-zinc-800 flex items-center justify-between shrink-0 bg-zinc-900">
          <div className="flex items-center gap-3">
            <Terminal className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-bold text-zinc-100 uppercase tracking-wider font-mono">
              Raw SMTP Protocol Transcript
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={copyLog}
              className="h-9 px-3.5 text-xs font-semibold bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-1.5" />
                  <span>Copy Raw</span>
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-zinc-400 hover:text-white rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6 font-mono text-sm leading-relaxed space-y-1.5 bg-zinc-950">
          {parsedLog.map((line, idx) => (
            <div
              key={idx}
              className={cn(
                "flex items-start gap-3 py-1 px-3 rounded hover:bg-zinc-900 transition-colors",
                line.direction === "client" && "text-cyan-400 font-medium",
                line.direction === "server" &&
                  (line.code?.startsWith("5")
                    ? "text-red-400 font-bold bg-red-950/20"
                    : line.code?.startsWith("2")
                    ? "text-emerald-400"
                    : "text-amber-300"),
                line.direction === "error" &&
                  "text-red-400 font-bold bg-red-950/30",
                line.direction === "system" && "text-zinc-500 italic"
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
      </div>
    </div>
  );
};
