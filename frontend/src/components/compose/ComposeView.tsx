import React, { useState, useEffect } from "react";
import {
  Send,
  Paperclip,
  X,
  Loader2,
  BookmarkPlus,
  Server,
  CheckCircle2,
  XCircle,
  FileCode,
  FileText,
  Copy,
  Check,
} from "lucide-react";
import { EmailReq, ServerProfile, Result } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { HtmlSplitEditor } from "./HtmlSplitEditor";
import { cn } from "../../lib/utils";

interface ComposeViewProps {
  email: EmailReq;
  onChange: (updated: EmailReq) => void;
  activeServer?: ServerProfile;
  profiles: ServerProfile[];
  onSelectServer: (id: string) => void;
  onSend: () => void;
  sending: boolean;
  sendResult: Result | null;
  onPickFiles: () => void;
  onSaveTemplate: (name: string) => void;
  historyMap: Record<string, string[]>;
  onInspectLog?: (log: string) => void;
}

export const ComposeView: React.FC<ComposeViewProps> = ({
  email,
  onChange,
  activeServer,
  profiles,
  onSelectServer,
  onSend,
  sending,
  sendResult,
  onPickFiles,
  onSaveTemplate,
  historyMap,
  onInspectLog,
}) => {
  const [showCc, setShowCc] = useState(email.cc && email.cc.length > 0);
  const [showBcc, setShowBcc] = useState(email.bcc && email.bcc.length > 0);
  const [showReplyTo, setShowReplyTo] = useState(!!email.replyTo);
  const [bodyType, setBodyType] = useState<"html" | "plain">(
    email.html ? "html" : "plain",
  );

  useEffect(() => {
    if (email.cc && email.cc.length > 0) setShowCc(true);
    if (email.bcc && email.bcc.length > 0) setShowBcc(true);
    if (email.replyTo) setShowReplyTo(true);
  }, [email.cc, email.bcc, email.replyTo]);
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);

  // Keyboard shortcut: Cmd/Ctrl + Enter to send
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        if (!sending && email.from && email.to.some((t) => t.trim())) {
          e.preventDefault();
          onSend();
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [sending, email, onSend]);

  const upd = (key: keyof EmailReq, val: any) => {
    onChange({ ...email, [key]: val });
  };

  const addRecipient = (field: "to" | "cc" | "bcc", val: string) => {
    const trimmed = val.trim();
    if (!trimmed) return;
    const current = email[field] || [];
    if (!current.includes(trimmed)) {
      upd(field, [...current.filter(Boolean), trimmed]);
    }
  };

  const removeRecipient = (field: "to" | "cc" | "bcc", index: number) => {
    const current = email[field] || [];
    upd(
      field,
      current.filter((_, i) => i !== index),
    );
  };

  const handlePasteRecipients = (
    field: "to" | "cc" | "bcc",
    rawText: string,
  ) => {
    const parts = rawText
      .split(/[,;\n\r]+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (!parts.length) return;
    const current = email[field] || [];
    const deduped = parts.filter((p) => !current.includes(p));
    upd(field, [...current.filter(Boolean), ...deduped]);
  };

  const removeAttachment = (index: number) => {
    upd(
      "attachments",
      email.attachments.filter((_, i) => i !== index),
    );
  };

  const handleSaveTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (templateName.trim()) {
      onSaveTemplate(templateName.trim());
      setTemplateName("");
      setIsSavingTemplate(false);
    }
  };

  const canSend =
    !sending &&
    !!email.from.trim() &&
    email.to.some((t) => t.trim()) &&
    !!activeServer;

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
      {/* Scrollable Compose Form */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="px-8 py-6 space-y-6 max-w-6xl w-full mx-auto">
          {/* Recipient & Header Card */}
          <div className="rounded-xl border border-border bg-white shadow-2xs overflow-hidden">
            {/* SENDER ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 border-b border-border divide-y md:divide-y-0 md:divide-x divide-border">
              <div className="flex items-center px-5 py-3 gap-3">
                <span className="text-xs font-semibold text-zinc-500 w-20 shrink-0">
                  From Name
                </span>
                <input
                  type="text"
                  value={email.fromName}
                  onChange={(e) => upd("fromName", e.target.value)}
                  placeholder="e.g. Mail Probe Tester"
                  className="flex-1 text-sm font-medium text-zinc-900 bg-transparent outline-none placeholder:text-zinc-400"
                />
              </div>
              <div className="flex items-center px-5 py-3 gap-3">
                <span className="text-xs font-semibold text-zinc-500 w-20 shrink-0">
                  From Email
                </span>
                <input
                  type="email"
                  value={email.from}
                  onChange={(e) => upd("from", e.target.value)}
                  placeholder="sender@example.com"
                  className="flex-1 text-sm font-medium text-zinc-900 font-mono bg-transparent outline-none placeholder:text-zinc-400 placeholder:font-sans"
                />
              </div>
            </div>

            {/* RECIPIENTS ROW: TO */}
            <div className="flex items-start px-5 py-3 border-b border-border min-h-[48px] gap-3">
              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider w-20 shrink-0 mt-2">
                To
              </span>
              <div className="flex-1 flex flex-wrap gap-2 items-center pt-0.5 min-w-0">
                {email.to
                  .filter((t) => t.trim())
                  .map((addr, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm font-mono font-medium animate-scale-in"
                    >
                      <span>{addr}</span>
                      <button
                        type="button"
                        onClick={() => removeRecipient("to", idx)}
                        className="text-emerald-600 hover:text-emerald-950 rounded-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                <input
                  type="text"
                  placeholder={
                    email.to.filter((t) => t.trim()).length === 0
                      ? "Add recipients (Enter or comma separated)…"
                      : "Add more…"
                  }
                  className="flex-1 min-w-[220px] text-sm font-mono text-zinc-900 bg-transparent outline-none py-1 placeholder:text-zinc-400 placeholder:font-sans"
                  onKeyDown={(e) => {
                    if (
                      (e.key === "Enter" || e.key === "," || e.key === "Tab") &&
                      (e.target as HTMLInputElement).value.trim()
                    ) {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value
                        .trim()
                        .replace(/[,;]$/, "");
                      if (val) {
                        addRecipient("to", val);
                        (e.target as HTMLInputElement).value = "";
                      }
                    } else if (
                      e.key === "Backspace" &&
                      !(e.target as HTMLInputElement).value &&
                      email.to.length > 0
                    ) {
                      removeRecipient("to", email.to.length - 1);
                    }
                  }}
                  onPaste={(e) => {
                    e.preventDefault();
                    handlePasteRecipients(
                      "to",
                      e.clipboardData.getData("text"),
                    );
                  }}
                  onBlur={(e) => {
                    const val = e.target.value.trim().replace(/[,;]$/, "");
                    if (val) {
                      addRecipient("to", val);
                      e.target.value = "";
                    }
                  }}
                />
              </div>
              {/* Cc / Bcc Expanders */}
              <div className="flex items-center gap-1.5 pt-1 shrink-0">
                {!showCc && (
                  <button
                    type="button"
                    onClick={() => setShowCc(true)}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                  >
                    Cc
                  </button>
                )}
                {!showBcc && (
                  <button
                    type="button"
                    onClick={() => setShowBcc(true)}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                  >
                    Bcc
                  </button>
                )}
                {!showReplyTo && (
                  <button
                    type="button"
                    onClick={() => setShowReplyTo(true)}
                    className="text-xs font-semibold text-zinc-500 hover:text-zinc-900 px-2 py-1 rounded hover:bg-zinc-100 transition-colors"
                  >
                    Reply-To
                  </button>
                )}
              </div>
            </div>

            {/* CC ROW */}
            {showCc && (
              <div className="flex items-start px-5 py-3 border-b border-border min-h-[46px] gap-3 bg-zinc-50/40">
                <span className="text-xs font-semibold text-zinc-500 w-20 shrink-0 mt-2">
                  Cc
                </span>
                <div className="flex-1 flex flex-wrap gap-2 items-center pt-0.5 min-w-0">
                  {email.cc
                    .filter((t) => t.trim())
                    .map((addr, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 text-sm font-mono font-medium"
                      >
                        <span>{addr}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipient("cc", idx)}
                          className="text-zinc-400 hover:text-zinc-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  <input
                    type="text"
                    placeholder="Add CC recipients…"
                    className="flex-1 min-w-[180px] text-sm font-mono text-zinc-900 bg-transparent outline-none py-1 placeholder:text-zinc-400 placeholder:font-sans"
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" ||
                          e.key === "," ||
                          e.key === "Tab") &&
                        (e.target as HTMLInputElement).value.trim()
                      ) {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value
                          .trim()
                          .replace(/[,;]$/, "");
                        if (val) {
                          addRecipient("cc", val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      handlePasteRecipients(
                        "cc",
                        e.clipboardData.getData("text"),
                      );
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    upd("cc", []);
                    setShowCc(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 p-1 mt-1"
                  title="Hide CC field"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* BCC ROW */}
            {showBcc && (
              <div className="flex items-start px-5 py-3 border-b border-border min-h-[46px] gap-3 bg-zinc-50/40">
                <span className="text-xs font-semibold text-zinc-500 w-20 shrink-0 mt-2">
                  Bcc
                </span>
                <div className="flex-1 flex flex-wrap gap-2 items-center pt-0.5 min-w-0">
                  {email.bcc
                    .filter((t) => t.trim())
                    .map((addr, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-zinc-100 border border-zinc-200 text-zinc-800 text-sm font-mono font-medium"
                      >
                        <span>{addr}</span>
                        <button
                          type="button"
                          onClick={() => removeRecipient("bcc", idx)}
                          className="text-zinc-400 hover:text-zinc-800"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    ))}
                  <input
                    type="text"
                    placeholder="Add BCC recipients…"
                    className="flex-1 min-w-[180px] text-sm font-mono text-zinc-900 bg-transparent outline-none py-1 placeholder:text-zinc-400 placeholder:font-sans"
                    onKeyDown={(e) => {
                      if (
                        (e.key === "Enter" ||
                          e.key === "," ||
                          e.key === "Tab") &&
                        (e.target as HTMLInputElement).value.trim()
                      ) {
                        e.preventDefault();
                        const val = (e.target as HTMLInputElement).value
                          .trim()
                          .replace(/[,;]$/, "");
                        if (val) {
                          addRecipient("bcc", val);
                          (e.target as HTMLInputElement).value = "";
                        }
                      }
                    }}
                    onPaste={(e) => {
                      e.preventDefault();
                      handlePasteRecipients(
                        "bcc",
                        e.clipboardData.getData("text"),
                      );
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    upd("bcc", []);
                    setShowBcc(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 p-1 mt-1"
                  title="Hide BCC field"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* REPLY-TO ROW */}
            {showReplyTo && (
              <div className="flex items-center px-5 py-3 border-b border-border gap-3 bg-zinc-50/40">
                <span className="text-xs font-semibold text-zinc-500 w-20 shrink-0">
                  Reply-To
                </span>
                <input
                  type="email"
                  value={email.replyTo}
                  onChange={(e) => upd("replyTo", e.target.value)}
                  placeholder="replies@example.com"
                  className="flex-1 text-sm font-medium text-zinc-900 font-mono bg-transparent outline-none placeholder:text-zinc-400 placeholder:font-sans"
                />
                <button
                  type="button"
                  onClick={() => {
                    upd("replyTo", "");
                    setShowReplyTo(false);
                  }}
                  className="text-zinc-400 hover:text-zinc-600 p-1"
                  title="Hide Reply-To field"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* SUBJECT ROW */}
            <div className="flex items-center px-5 py-3.5 gap-3">
              <span className="text-xs font-semibold text-zinc-500 w-20 shrink-0">
                Subject
              </span>
              <input
                type="text"
                value={email.subject}
                onChange={(e) => upd("subject", e.target.value)}
                placeholder="e.g. Mail Probe: Delivery Handshake Verification"
                className="flex-1 text-sm font-semibold text-zinc-900 bg-transparent outline-none placeholder:text-zinc-400 placeholder:font-normal"
              />
            </div>
          </div>

          {/* Message Format Switcher & Attachment Trigger */}
          <div className="flex items-center justify-between">
            <div className="flex items-center bg-zinc-200/70 p-1 rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setBodyType("html")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  bodyType === "html"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900",
                )}
              >
                <FileCode className="w-4 h-4 text-purple-600" />
                <span>HTML & Live Split Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setBodyType("plain")}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                  bodyType === "plain"
                    ? "bg-white text-zinc-900 shadow-xs"
                    : "text-zinc-600 hover:text-zinc-900",
                )}
              >
                <FileText className="w-4 h-4 text-blue-600" />
                <span>Plain Text Only</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {email.attachments.length > 0 && (
                <span className="text-xs font-medium text-zinc-600">
                  📎 {email.attachments.length} attached
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPickFiles}
                className="h-9 px-3.5 text-xs font-semibold bg-white text-zinc-700 hover:bg-zinc-50 border-border shadow-2xs"
              >
                <Paperclip className="w-3.5 h-3.5 mr-1.5" />
                <span>Attach Files</span>
              </Button>
            </div>
          </div>

          {/* Message Body Area */}
          {bodyType === "html" ? (
            <HtmlSplitEditor
              value={email.html}
              onChange={(val) => upd("html", val)}
            />
          ) : (
            <div className="rounded-xl border border-border bg-white overflow-hidden shadow-xs flex flex-col h-[520px]">
              <div className="h-12 px-4 bg-zinc-50 border-b border-border flex items-center justify-between shrink-0 select-none">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-zinc-500" />
                  <span className="text-xs font-bold text-zinc-700 uppercase tracking-wider">
                    Plain Text Message
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(email.body);
                    setCopiedPlain(true);
                    setTimeout(() => setCopiedPlain(false), 1500);
                  }}
                  disabled={!email.body.trim()}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium text-zinc-700 hover:bg-zinc-200/70 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Copy plain text to clipboard"
                >
                  {copiedPlain ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-semibold">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={email.body}
                onChange={(e) => upd("body", e.target.value)}
                placeholder="Write your plain-text email message here…"
                className="flex-1 w-full p-4 text-sm font-mono leading-relaxed text-zinc-900 bg-transparent resize-none outline-none focus:outline-none placeholder:text-zinc-400 placeholder:font-sans selection:bg-emerald-100"
                spellCheck={false}
              />

              <div className="h-8 px-4 border-t border-zinc-100 bg-zinc-50 flex items-center justify-between text-xs text-zinc-500 font-mono shrink-0 select-none">
                <span>{email.body.length} characters</span>
                <span>
                  {email.body.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>
          )}

          {/* Attachments Tray */}
          {email.attachments.length > 0 && (
            <div className="rounded-xl border border-border bg-white p-4 shadow-2xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-zinc-700 flex items-center gap-2">
                  <Paperclip className="w-4 h-4 text-zinc-400" />
                  <span>Attachments ({email.attachments.length})</span>
                </span>
                <button
                  type="button"
                  onClick={onPickFiles}
                  className="text-xs text-emerald-600 hover:text-emerald-700 font-semibold"
                >
                  + Add more
                </button>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {email.attachments.map((filePath, i) => {
                  const fileName = filePath.split(/[/\\]/).pop() || filePath;
                  const ext =
                    fileName.split(".").pop()?.toUpperCase() || "FILE";
                  return (
                    <div
                      key={i}
                      className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-lg border border-border bg-zinc-50 text-xs text-zinc-800 font-medium"
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0 uppercase font-mono bg-zinc-200 text-zinc-700"
                      >
                        {ext}
                      </Badge>
                      <span className="max-w-[200px] truncate">{fileName}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="p-1 text-zinc-400 hover:text-red-500 rounded transition-colors"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Result Notification */}
          {sendResult && (
            <div
              className={cn(
                "rounded-xl border p-5 shadow-sm animate-fade-up",
                sendResult.success
                  ? "bg-emerald-50/70 border-emerald-300"
                  : "bg-red-50/70 border-red-300",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {sendResult.success ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <h4
                      className={cn(
                        "text-sm font-bold leading-tight",
                        sendResult.success
                          ? "text-emerald-950"
                          : "text-red-950",
                      )}
                    >
                      {sendResult.success
                        ? "Email Successfully Dispatched"
                        : "Delivery Failed"}
                    </h4>
                    <p
                      className={cn(
                        "text-xs mt-1 leading-relaxed font-mono font-medium",
                        sendResult.success
                          ? "text-emerald-800"
                          : "text-red-800",
                      )}
                    >
                      {sendResult.message}
                    </p>
                    {(sendResult.queueId || sendResult.duration) && (
                      <div className="flex items-center gap-5 mt-2.5 text-xs text-zinc-700">
                        {sendResult.queueId && (
                          <span>
                            <strong>Queue ID:</strong>{" "}
                            <code className="bg-white px-1.5 py-0.5 rounded border border-border font-bold">
                              {sendResult.queueId}
                            </code>
                          </span>
                        )}
                        {sendResult.duration && (
                          <span>
                            <strong>Duration:</strong> {sendResult.duration}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {sendResult.log && onInspectLog && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onInspectLog(sendResult.log!)}
                    className="h-8 text-xs font-semibold bg-white text-zinc-800 hover:bg-zinc-50 border-border shrink-0 shadow-2xs"
                  >
                    Inspect SMTP Log
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Docked Action Footer */}
      <footer className="h-20 px-8 bg-white border-t border-border flex items-center justify-between shrink-0 shadow-xs z-10">
        {/* Left: Active Relay & Info */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-zinc-500">Route via:</span>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-100 border border-border text-sm font-semibold text-zinc-800">
            <Server className="w-4 h-4 text-zinc-500" />
            <span>{activeServer ? activeServer.name : "None selected"}</span>
            {activeServer && (
              <Badge
                variant="outline"
                className="text-xs py-0 px-1.5 font-mono text-zinc-600 bg-white"
              >
                :{activeServer.port}
              </Badge>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-4">
          {/* Save as Template */}
          {isSavingTemplate ? (
            <form
              onSubmit={handleSaveTemplateSubmit}
              className="flex items-center gap-2 animate-scale-in"
            >
              <input
                autoFocus
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name…"
                className="h-10 px-3 rounded-lg border border-border text-sm text-zinc-900 outline-none w-52 focus:border-emerald-500"
              />
              <Button
                type="submit"
                size="sm"
                className="h-10 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                disabled={!templateName.trim()}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10 px-2.5 text-xs text-zinc-500"
                onClick={() => setIsSavingTemplate(false)}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSavingTemplate(true)}
              className="h-10 text-xs font-semibold text-zinc-700 bg-white hover:bg-zinc-50 border-border"
            >
              <BookmarkPlus className="w-4 h-4 mr-2 text-zinc-500" />
              <span>Save as Template</span>
            </Button>
          )}

          {/* Primary Send Email Button */}
          <Button
            type="button"
            size="sm"
            onClick={onSend}
            disabled={!canSend}
            className={cn(
              "h-11 px-6 text-sm font-bold gap-2.5 rounded-lg shadow-sm transition-all",
              canSend
                ? "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20"
                : "bg-zinc-200 text-zinc-400 cursor-not-allowed",
            )}
          >
            {sending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Dispatching…</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Send Email</span>
                <span className="text-xs opacity-75 font-mono ml-1">⌘↵</span>
              </>
            )}
          </Button>
        </div>
      </footer>
    </div>
  );
};
