import React, { useState, useEffect, useRef } from "react";
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
  ChevronUp,
  Plus,
} from "lucide-react";
import { EmailReq, ServerProfile, Result } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { HtmlSplitEditor } from "./HtmlSplitEditor";
import { RecipientRow } from "./RecipientRow";
import { cn } from "../../lib/utils";
import { ViewShell, ViewContent } from "../layout/PageContainer";

interface ComposeViewProps {
  email: EmailReq;
  onChange: (updated: EmailReq) => void;
  activeServer?: ServerProfile;
  profiles: ServerProfile[];
  onSelectServer: (id: string) => void;
  testStatus: Record<string, boolean>;
  onAddServer?: () => void;
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
  testStatus,
  onAddServer,
  onSend,
  sending,
  sendResult,
  onPickFiles,
  onSaveTemplate,
  historyMap,
  onInspectLog,
}) => {
  const [showCc, setShowCc] = useState(false);
  const [showBcc, setShowBcc] = useState(false);
  const [showReplyTo, setShowReplyTo] = useState(false);
  const [bodyType, setBodyType] = useState<"html" | "plain">(
    email.html ? "html" : "plain",
  );

  const isCcVisible = showCc || (email.cc?.length ?? 0) > 0;
  const isBccVisible = showBcc || (email.bcc?.length ?? 0) > 0;
  const isReplyToVisible = showReplyTo || !!email.replyTo;
  const [templateName, setTemplateName] = useState("");
  const [isSavingTemplate, setIsSavingTemplate] = useState(false);
  const [templateSaved, setTemplateSaved] = useState(false);
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [serverMenuOpen, setServerMenuOpen] = useState(false);
  const serverMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        serverMenuRef.current &&
        !serverMenuRef.current.contains(e.target as Node)
      ) {
        setServerMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

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

  const upd = <K extends keyof EmailReq>(key: K, val: EmailReq[K]) => {
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
      setTemplateSaved(true);
      setTimeout(() => setTemplateSaved(false), 1800);
    }
  };

  const canSend =
    !sending &&
    !!email.from.trim() &&
    email.to.some((t) => t.trim()) &&
    !!activeServer;

  return (
    <ViewShell>
      {/* Scrollable Compose Form */}
      <ViewContent maxWidth="6xl" className="space-y-6">
          {/* Recipient & Header Card */}
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            {/* SENDER ROW */}
            <div className="grid grid-cols-1 divide-y divide-border border-b border-border md:grid-cols-2 md:divide-x md:divide-y-0">
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">
                  From Name
                </span>
                <input
                  type="text"
                  list="history-from-name"
                  value={email.fromName}
                  onChange={(e) => upd("fromName", e.target.value)}
                  placeholder="e.g. Mail Probe Tester"
                  className="flex-1 bg-transparent text-[13px] font-medium text-foreground outline-none placeholder:text-muted-foreground"
                />
              </div>
              <div className="flex items-center gap-3 px-5 py-2.5">
                <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">
                  From Email
                </span>
                <input
                  type="email"
                  list="history-from"
                  value={email.from}
                  onChange={(e) => upd("from", e.target.value)}
                  placeholder="sender@example.com"
                  className="flex-1 bg-transparent font-mono text-[13px] font-medium text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground"
                />
              </div>
            </div>

            {/* RECIPIENTS ROW: TO */}
            <RecipientRow
              label="To"
              recipients={email.to}
              placeholder={
                email.to.filter((t) => t.trim()).length === 0
                  ? "Add recipients (Enter or comma separated)…"
                  : "Add more…"
              }
              listId="history-to"
              accent
              onAdd={(val) => addRecipient("to", val)}
              onRemove={(idx) => removeRecipient("to", idx)}
              onPaste={(raw) => handlePasteRecipients("to", raw)}
              trailingActions={
                <div className="flex shrink-0 items-center gap-1 pt-0.5">
                  {!isCcVisible && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Cc
                    </button>
                  )}
                  {!isBccVisible && (
                    <button
                      type="button"
                      onClick={() => setShowBcc(true)}
                      className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Bcc
                    </button>
                  )}
                  {!isReplyToVisible && (
                    <button
                      type="button"
                      onClick={() => setShowReplyTo(true)}
                      className="rounded px-2 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      Reply-To
                    </button>
                  )}
                </div>
              }
            />

            {/* CC ROW */}
            {isCcVisible && (
              <RecipientRow
                label="Cc"
                recipients={email.cc}
                placeholder="Add CC recipients…"
                listId="history-to"
                onAdd={(val) => addRecipient("cc", val)}
                onRemove={(idx) => removeRecipient("cc", idx)}
                onPaste={(raw) => handlePasteRecipients("cc", raw)}
                onClearField={() => {
                  upd("cc", []);
                  setShowCc(false);
                }}
                clearTitle="Hide CC field"
              />
            )}

            {/* BCC ROW */}
            {isBccVisible && (
              <RecipientRow
                label="Bcc"
                recipients={email.bcc}
                placeholder="Add BCC recipients…"
                listId="history-to"
                onAdd={(val) => addRecipient("bcc", val)}
                onRemove={(idx) => removeRecipient("bcc", idx)}
                onPaste={(raw) => handlePasteRecipients("bcc", raw)}
                onClearField={() => {
                  upd("bcc", []);
                  setShowBcc(false);
                }}
                clearTitle="Hide BCC field"
              />
            )}

            {/* REPLY-TO ROW */}
            {isReplyToVisible && (
              <div className="flex items-center gap-3 border-b border-border bg-muted/30 px-5 py-2.5">
                <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">
                  Reply-To
                </span>
                <input
                  type="email"
                  list="history-from"
                  value={email.replyTo}
                  onChange={(e) => upd("replyTo", e.target.value)}
                  placeholder="replies@example.com"
                  className="flex-1 bg-transparent font-mono text-[13px] font-medium text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground"
                />
                <button
                  type="button"
                  onClick={() => {
                    upd("replyTo", "");
                    setShowReplyTo(false);
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground"
                  title="Hide Reply-To field"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* SUBJECT ROW */}
            <div className="flex items-center gap-3 px-5 py-3">
              <span className="w-20 shrink-0 text-xs font-semibold text-muted-foreground">
                Subject
              </span>
              <input
                type="text"
                list="history-subject"
                value={email.subject}
                onChange={(e) => upd("subject", e.target.value)}
                placeholder="e.g. Mail Probe: Delivery Handshake Verification"
                className="flex-1 bg-transparent text-[13px] font-semibold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
              />
            </div>

            {/* Autocomplete Datalists from Sent History */}
            <datalist id="history-from-name">
              {(historyMap.email_from_name || []).map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <datalist id="history-from">
              {(historyMap.email_from || []).map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <datalist id="history-to">
              {(historyMap.email_to || []).map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
            <datalist id="history-subject">
              {(historyMap.email_subject || []).map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          </div>

          {/* Message Format Switcher & Attachment Trigger */}
          <div className="flex items-center justify-between">
            <div className="flex items-center rounded-xl border border-border bg-zinc-200/70 p-1">
              <button
                type="button"
                onClick={() => setBodyType("html")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  bodyType === "html"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileCode className="size-4 text-purple-600" />
                <span>HTML & Live Split Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setBodyType("plain")}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors",
                  bodyType === "plain"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <FileText className="size-4 text-blue-600" />
                <span>Plain Text Only</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              {email.attachments.length > 0 && (
                <span className="text-xs font-medium text-muted-foreground">
                  📎 {email.attachments.length} attached
                </span>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={onPickFiles}
                className="h-8 border-border bg-card px-3 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/50"
              >
                <Paperclip className="mr-1.5 size-3.5" />
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
            <div className="flex h-130 flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-muted/50 px-4 select-none">
                <div className="flex items-center gap-2">
                  <FileText className="size-4 text-zinc-500" />
                  <span className="text-xs font-bold tracking-wider text-zinc-700 uppercase">
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
                  className="flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-200/70 disabled:cursor-not-allowed disabled:opacity-40"
                  title="Copy plain text to clipboard"
                >
                  {copiedPlain ? (
                    <>
                      <Check className="size-3.5 text-emerald-600" />
                      <span className="font-semibold text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>

              <textarea
                value={email.body}
                onChange={(e) => upd("body", e.target.value)}
                placeholder="Write your plain-text email message here…"
                className="w-full flex-1 resize-none bg-transparent p-4 font-mono text-[13px] leading-relaxed text-foreground outline-none selection:bg-emerald-100 placeholder:font-sans placeholder:text-muted-foreground focus:outline-none"
                spellCheck={false}
              />

              <div className="flex h-8 shrink-0 items-center justify-between border-t border-zinc-100 bg-zinc-50 px-4 font-mono text-xs text-zinc-500 select-none">
                <span>{email.body.length} characters</span>
                <span>
                  {email.body.split(/\s+/).filter(Boolean).length} words
                </span>
              </div>
            </div>
          )}

          {/* Attachments Tray */}
          {email.attachments.length > 0 && (
            <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs font-bold text-zinc-700">
                  <Paperclip className="size-4 text-zinc-400" />
                  <span>Attachments ({email.attachments.length})</span>
                </span>
                <button
                  type="button"
                  onClick={onPickFiles}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-700"
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
                      className="flex items-center gap-2 rounded-lg border border-border bg-zinc-50 py-1.5 pr-2 pl-3 text-xs font-medium text-zinc-800"
                    >
                      <Badge
                        variant="secondary"
                        className="bg-zinc-200 px-1.5 py-0 font-mono text-[10px] text-zinc-700 uppercase"
                      >
                        {ext}
                      </Badge>
                      <span className="max-w-50 truncate">{fileName}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(i)}
                        className="rounded p-1 text-zinc-400 transition-colors hover:text-red-500"
                        title="Remove attachment"
                      >
                        <X className="size-3.5" />
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
                "animate-fade-up rounded-xl border p-5 shadow-sm",
                sendResult.success
                  ? "border-emerald-300 bg-emerald-50/70"
                  : "border-red-300 bg-red-50/70",
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3.5">
                  {sendResult.success ? (
                    <CheckCircle2 className="mt-0.5 size-6 shrink-0 text-emerald-600" />
                  ) : (
                    <XCircle className="mt-0.5 size-6 shrink-0 text-red-600" />
                  )}
                  <div>
                    <h4
                      className={cn(
                        "text-sm leading-tight font-bold",
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
                        "mt-1 font-mono text-xs leading-relaxed font-medium",
                        sendResult.success
                          ? "text-emerald-800"
                          : "text-red-800",
                      )}
                    >
                      {sendResult.message}
                    </p>
                    {(sendResult.queueId || sendResult.duration) && (
                      <div className="mt-2.5 flex items-center gap-5 text-xs text-zinc-700">
                        {sendResult.queueId && (
                          <span>
                            <strong>Queue ID:</strong>{" "}
                            <code className="rounded border border-border bg-white px-1.5 py-0.5 font-bold">
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
                    className="h-9 shrink-0 border-border bg-card text-xs font-semibold text-foreground shadow-sm hover:bg-muted/50"
                  >
                    Inspect SMTP Log
                  </Button>
                )}
              </div>
            </div>
          )}
      </ViewContent>

      {/* Docked Action Footer */}
      <footer className="z-10 flex h-14 shrink-0 items-center justify-between border-t border-border bg-card px-6">
        {/* Left: Interactive Route Via Server Selector */}
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-medium text-muted-foreground">Route via:</span>
          <div ref={serverMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setServerMenuOpen((o) => !o)}
              className="flex h-8 items-center gap-2 rounded-lg border border-border bg-muted/60 px-2.5 text-xs font-semibold text-foreground transition-colors hover:border-zinc-300 hover:bg-muted"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  activeServer && testStatus[activeServer.id] === true
                    ? "bg-emerald-500"
                    : activeServer && testStatus[activeServer.id] === false
                      ? "bg-red-500"
                      : "bg-zinc-400"
                )}
              />
              <Server className="size-3.5 text-muted-foreground" />
              <span className="max-w-45 truncate">
                {activeServer ? activeServer.name : "Select Relay"}
              </span>
              {activeServer && (
                <Badge
                  variant="outline"
                  className="bg-card px-1.5 py-0 font-mono text-[11px] text-muted-foreground"
                >
                  :{activeServer.port}
                </Badge>
              )}
              <ChevronUp
                className={cn(
                  "size-3.5 text-muted-foreground transition-transform",
                  serverMenuOpen && "rotate-180"
                )}
              />
            </button>

            {serverMenuOpen && (
              <div className="absolute bottom-full left-0 z-50 mb-2 w-72 animate-scale-in rounded-xl border border-border bg-card py-1.5 shadow-xl">
                <div className="flex items-center justify-between border-b border-border px-3.5 py-2">
                  <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Select Server
                  </span>
                  {onAddServer && (
                    <button
                      type="button"
                      onClick={() => {
                        setServerMenuOpen(false);
                        onAddServer();
                      }}
                      className="flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-700"
                    >
                      <Plus className="size-3.5" /> Add New
                    </button>
                  )}
                </div>
                <div className="max-h-60 space-y-1 overflow-y-auto p-1.5">
                  {profiles.map((p) => {
                    const isSelected = activeServer?.id === p.id;
                    const ok = testStatus[p.id];
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          onSelectServer(p.id);
                          setServerMenuOpen(false);
                        }}
                        className={cn(
                          "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] transition-colors",
                          isSelected
                            ? "bg-emerald-50 font-semibold text-emerald-900"
                            : "text-foreground hover:bg-muted/50"
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-2.5 pr-2">
                          <span
                            className={cn(
                              "size-2 shrink-0 rounded-full",
                              ok === true
                                ? "bg-emerald-500"
                                : ok === false
                                  ? "bg-red-500"
                                  : "bg-zinc-300"
                            )}
                          />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{p.name}</p>
                            <p className="truncate font-mono text-xs text-muted-foreground">
                              {p.server || "localhost"}:{p.port}
                            </p>
                          </div>
                        </div>
                        {isSelected && (
                          <Check className="size-4 shrink-0 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Save as Template */}
          {isSavingTemplate ? (
            <form
              onSubmit={handleSaveTemplateSubmit}
              className="flex animate-scale-in items-center gap-2"
            >
              <input
                autoFocus
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="Template name…"
                className="h-9 w-48 rounded-lg border border-border bg-card px-3 text-[13px] text-foreground outline-none focus:border-emerald-500"
              />
              <Button
                type="submit"
                size="sm"
                className="h-9 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
                disabled={!templateName.trim()}
              >
                Save
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-9 px-2.5 text-xs text-muted-foreground"
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
              className="h-9 border-border bg-card text-xs font-semibold text-foreground hover:bg-muted/50"
            >
              {templateSaved ? (
                <>
                  <Check className="mr-1.5 size-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Template Saved</span>
                </>
              ) : (
                <>
                  <BookmarkPlus className="mr-1.5 size-3.5 text-muted-foreground" />
                  <span>Save as Template</span>
                </>
              )}
            </Button>
          )}

          {/* Primary Send Email Button */}
          <Button
            type="button"
            size="sm"
            onClick={onSend}
            disabled={!canSend}
            className={cn(
              "h-9 gap-2 rounded-lg px-4 text-[13px] font-bold shadow-sm transition-all",
              canSend
                ? "bg-emerald-600 text-white shadow-emerald-600/20 hover:bg-emerald-700"
                : "cursor-not-allowed bg-zinc-200 text-zinc-400",
            )}
          >
            {sending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                <span>Dispatching…</span>
              </>
            ) : (
              <>
                <Send className="size-4" />
                <span>Send Email</span>
                <span className="ml-1 font-mono text-xs opacity-75">⌘↵</span>
              </>
            )}
          </Button>
        </div>
      </footer>
    </ViewShell>
  );
};
