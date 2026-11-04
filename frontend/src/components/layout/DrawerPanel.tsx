import React, { useState } from "react";
import {
  X,
  Copy,
  Check,
  Bookmark,
  FileText,
  Send,
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
    <div className="w-[380px] max-w-full border-l border-border bg-white flex flex-col shrink-0 h-full animate-slide-in-right shadow-xl z-20 overflow-hidden">
      {/* Drawer Header */}
      <div className="h-16 px-5 border-b border-border bg-zinc-50/70 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          {tab === "snippets" ? (
            <Bookmark className="w-4 h-4 text-emerald-600" />
          ) : (
            <FileText className="w-4 h-4 text-emerald-600" />
          )}
          <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
            {tab === "snippets" ? "Quick Snippets" : "Email Templates"}
          </span>
          <Badge variant="secondary" className="text-xs px-2 py-0.5 font-semibold">
            {tab === "snippets"
              ? snippets.reduce((a, g) => a + g.items.filter((i) => i.value).length, 0)
              : templates.length}
          </Badge>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-800 hover:bg-zinc-200/60 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {tab === "snippets" ? (
          snippets.length === 0 ? (
            <div className="py-16 text-center text-sm text-zinc-400">
              No snippets configured yet.
            </div>
          ) : (
            snippets.map((g) => (
              <div
                key={g.id}
                className="rounded-xl border border-border bg-zinc-50/60 overflow-hidden"
              >
                <div className="px-3.5 py-2 border-b border-border bg-zinc-100/70 flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-800 truncate">
                    {g.name}
                  </span>
                  <span className="text-xs text-zinc-500 font-mono">
                    {g.items.filter((i) => i.value).length}
                  </span>
                </div>
                <div className="divide-y divide-border/60">
                  {g.items
                    .filter((i) => i.value.trim())
                    .map((item) => (
                      <div
                        key={item.id}
                        className="px-3 py-2 flex items-center justify-between gap-2 text-sm font-mono text-zinc-800 hover:bg-white transition-colors group min-w-0 overflow-hidden"
                      >
                        <span className="truncate flex-1 min-w-0">
                          {item.value}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() => copyVal(item.id, item.value)}
                            className="p-1.5 text-zinc-400 hover:text-zinc-800 rounded"
                            title="Copy snippet"
                          >
                            {copiedId === item.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
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
              className="rounded-xl border border-border bg-white p-4 hover:border-zinc-300 transition-colors shadow-2xs space-y-2.5 min-w-0 overflow-hidden"
            >
              <div>
                <h4 className="text-sm font-bold text-zinc-900 truncate">
                  {tmpl.name}
                </h4>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  {tmpl.email.subject || "(No Subject)"}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {tmpl.email.html && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                    HTML
                  </span>
                )}
                {tmpl.email.body && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                    Plain
                  </span>
                )}
              </div>

              <Button
                size="sm"
                onClick={() => onUseTemplate(tmpl)}
                className="w-full h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
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
