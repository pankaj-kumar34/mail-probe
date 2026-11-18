import React, { useState } from "react";
import { X, Copy, Check, Terminal } from "lucide-react";
import { Button } from "../ui/button";
import { SmtpLogViewer } from "./SmtpLogViewer";

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

  const copyLog = () => {
    navigator.clipboard.writeText(log);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-zinc-900/50 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[85vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-zinc-800 bg-zinc-900 px-6">
          <div className="flex items-center gap-3">
            <Terminal className="size-5 text-emerald-400" />
            <h3 className="font-mono text-sm font-bold tracking-wider text-zinc-100 uppercase">
              Raw SMTP Protocol Transcript
            </h3>
          </div>

          <div className="flex items-center gap-3">
            <Button
              size="sm"
              variant="outline"
              onClick={copyLog}
              className="h-9 border-zinc-700 bg-zinc-800 px-3.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700"
            >
              {copied ? (
                <>
                  <Check className="mr-1.5 size-4 text-emerald-400" />
                  <span className="font-bold text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="mr-1.5 size-4" />
                  <span>Copy Raw</span>
                </>
              )}
            </Button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:text-white"
            >
              <X className="size-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto bg-zinc-950 p-6">
          <SmtpLogViewer log={log} />
        </div>
      </div>
    </div>
  );
};
