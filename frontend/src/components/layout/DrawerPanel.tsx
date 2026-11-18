import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Bookmark,
  FileText,
} from "lucide-react";
import { SnippetGroup, EmailTemplate } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { SnippetInsertButton } from "../snippets/SnippetInsertButton";
import { SnippetTarget } from "../../lib/snippetUtils";

interface DrawerPanelProps {
  isOpen: boolean;
  tab: "snippets" | "templates" | null;
  onClose: () => void;
  snippets: SnippetGroup[];
  templates: EmailTemplate[];
  onUseTemplate: (template: EmailTemplate) => void;
  onInsertSnippet?: (text: string, target: SnippetTarget) => void;
}

export const DrawerPanel: React.FC<DrawerPanelProps> = ({
  isOpen,
  tab,
  onClose,
  snippets,
  templates,
  onUseTemplate,
  onInsertSnippet,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen || !tab) return null;

  const copyVal = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div className="z-20 flex h-full w-95 max-w-full shrink-0 animate-slide-in-right flex-col overflow-hidden border-l border-border bg-card shadow-xl">
      {/* Drawer Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-muted/50 px-5">
        <div className="flex items-center gap-2.5">
          {tab === "snippets" ? (
            <Bookmark className="size-4 text-emerald-600" />
          ) : (
            <FileText className="size-4 text-emerald-600" />
          )}
          <span className="text-xs font-bold tracking-wider text-zinc-800 uppercase">
            {tab === "snippets" ? "Quick Snippets" : "Email Templates"}
          </span>
          <Badge variant="secondary" className="px-2 py-0.5 text-xs font-semibold">
            {tab === "snippets"
              ? snippets.reduce((a, g) => a + g.items.filter((i) => i.value).length, 0)
              : templates.length}
          </Badge>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-200/60 hover:text-zinc-800"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {tab === "snippets" ? (
          snippets.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              No snippets configured yet.
            </div>
          ) : (
            snippets.map((g) => (
              <div
                key={g.id}
                className="overflow-hidden rounded-xl border border-border bg-zinc-50/60"
              >
                <div className="flex items-center justify-between border-b border-border bg-zinc-100/70 px-3.5 py-2">
                  <span className="truncate text-xs font-bold text-zinc-800">
                    {g.name}
                  </span>
                  <span className="font-mono text-xs text-zinc-500">
                    {g.items.filter((i) => i.value).length}
                  </span>
                </div>
                <div className="divide-y divide-border/60">
                  {g.items
                    .filter((i) => i.value.trim())
                    .map((item) => (
                      <div
                        key={item.id}
                        className="group flex min-w-0 items-center justify-between gap-2 overflow-hidden px-3 py-1.5 font-mono text-xs text-foreground transition-colors hover:bg-card"
                      >
                        <span className="min-w-0 flex-1 truncate">
                          {item.value}
                        </span>
                        <div className="flex shrink-0 items-center gap-1.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                          <button
                            type="button"
                            onClick={() => copyVal(item.id, item.value)}
                            className="rounded p-1.5 text-zinc-400 hover:text-zinc-800"
                            title="Copy snippet"
                          >
                            {copiedId === item.id ? (
                              <Check className="size-4 text-emerald-600" />
                            ) : (
                              <Copy className="size-4" />
                            )}
                          </button>
                          {onInsertSnippet && (
                            <SnippetInsertButton
                              value={item.value}
                              groupName={g.name}
                              onInsert={onInsertSnippet}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))
          )
        ) : templates.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-400">
            No templates saved yet.
          </div>
        ) : (
          templates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="min-w-0 space-y-2.5 overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-zinc-300"
            >
              <div>
                <h4 className="truncate text-[13px] font-bold text-zinc-900">
                  {tmpl.name}
                </h4>
                <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
                  {tmpl.email.subject || "(No Subject)"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {tmpl.email.html && (
                  <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700">
                    HTML
                  </span>
                )}
                {tmpl.email.body && (
                  <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                    Plain
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => onUseTemplate(tmpl)}
                className="h-8 w-full bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                Use in Compose
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
