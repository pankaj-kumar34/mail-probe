import React, { useState } from "react";
import {
  FileText,
  Mail,
  Trash2,
  Eye,
  X,
  Smartphone,
  Monitor,
  Search,
} from "lucide-react";
import { EmailTemplate } from "../../types";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";
import {
  ViewShell,
  ViewToolbar,
  ViewContent,
  ViewEmptyState,
} from "../layout/PageContainer";

interface TemplatesViewProps {
  templates: EmailTemplate[];
  onLoadTemplate: (template: EmailTemplate) => void;
  onDeleteTemplate: (id: string) => void;
}

export const TemplatesView: React.FC<TemplatesViewProps> = ({
  templates,
  onLoadTemplate,
  onDeleteTemplate,
}) => {
  const [search, setSearch] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(
    null
  );
  const [modalViewport, setModalViewport] = useState<"desktop" | "mobile">(
    "desktop"
  );

  const filteredTemplates = templates.filter((t) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      t.name.toLowerCase().includes(q) ||
      (t.email.subject && t.email.subject.toLowerCase().includes(q))
    );
  });

  return (
    <ViewShell>
      {/* Streamlined Toolbar (when templates exist) */}
      {templates.length > 0 && (
        <ViewToolbar>
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates by name or subject…"
                className="h-8 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-[13px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-emerald-500 focus:bg-card"
              />
            </div>
            <span className="text-xs font-medium text-muted-foreground">
              {filteredTemplates.length === templates.length
                ? `${templates.length} saved ${templates.length === 1 ? "template" : "templates"}`
                : `Showing ${filteredTemplates.length} of ${templates.length} templates`}
            </span>
          </div>
        </ViewToolbar>
      )}

      {/* Grid or Centered Empty State */}
      {templates.length === 0 || filteredTemplates.length === 0 ? (
        <ViewEmptyState
          icon={FileText}
          title={search ? "No matching templates" : "No templates saved yet"}
          description={
            search
              ? `No templates matched "${search}". Try searching with a different keyword.`
              : 'Draft an email in Compose and click "Save as Template" in the bottom dock to reuse it anytime.'
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
        <ViewContent maxWidth="6xl">
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredTemplates.map((tmpl) => {
              const hasHtml = !!tmpl.email.html?.trim();
              const hasPlain = !!tmpl.email.body?.trim();
              const hasAttachments = tmpl.email.attachments?.length > 0;

              return (
                <div
                  key={tmpl.id}
                  className="group flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Card Title & Tags */}
                  <div className="border-b border-border bg-muted/50 p-5">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pr-3">
                        <h3 className="truncate text-[13px] font-bold text-foreground">
                          {tmpl.name}
                        </h3>
                        <p className="mt-1 truncate text-xs font-medium text-zinc-500">
                          {tmpl.email.subject || "(No Subject)"}
                        </p>
                      </div>
                      <span className="shrink-0 font-mono text-xs text-zinc-400">
                        {new Date(tmpl.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      {hasHtml && (
                        <span className="rounded border border-purple-200 bg-purple-50 px-2 py-0.5 text-xs font-bold text-purple-700">
                          HTML
                        </span>
                      )}
                      {hasPlain && (
                        <span className="rounded border border-blue-200 bg-blue-50 px-2 py-0.5 text-xs font-bold text-blue-700">
                          Plain Text
                        </span>
                      )}
                      {hasAttachments && (
                        <span className="flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700">
                          📎 {tmpl.email.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Preview Box */}
                  <div
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="group/preview relative h-40 cursor-pointer overflow-hidden border-b border-border bg-zinc-100/70 p-3"
                    title="Click to expand full preview"
                  >
                    <div className="pointer-events-none size-full overflow-hidden rounded-lg border border-border bg-white">
                      {hasHtml ? (
                        <iframe
                          srcDoc={`<style>*{margin:0;padding:0;box-sizing:border-box;}body{transform:scale(0.65);transform-origin:top left;width:155%;overflow:hidden;}</style>${tmpl.email.html}`}
                          sandbox="allow-same-origin"
                          scrolling="no"
                          className="block size-full border-0"
                          title={tmpl.name}
                        />
                      ) : (
                        <p className="line-clamp-5 p-3 font-mono text-xs leading-relaxed text-zinc-600">
                          {tmpl.email.body || "Empty body"}
                        </p>
                      )}
                    </div>

                    <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/15 opacity-0 transition-opacity group-hover/preview:opacity-100">
                      <span className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-zinc-900 shadow-sm">
                        <Eye className="size-4" />
                        <span>Preview Template</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-between gap-2 bg-white p-3.5">
                    <Button
                      size="sm"
                      onClick={() => onLoadTemplate(tmpl)}
                      className="h-8 flex-1 bg-emerald-600 text-xs font-semibold text-white hover:bg-emerald-700"
                    >
                      <Mail className="mr-1.5 size-3.5" />
                      <span>Use in Compose</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tmpl.id)}
                      className="rounded p-2 text-zinc-400 transition-colors hover:text-red-600"
                      title="Delete template"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ViewContent>
      )}

      {/* Expanded Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center bg-zinc-900/50 p-6 backdrop-blur-sm"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-4xl animate-scale-in flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-muted/50 px-6">
              <div className="min-w-0 pr-4">
                <h3 className="truncate text-sm font-bold text-foreground">
                  {previewTemplate.name}
                </h3>
                <p className="mt-0.5 truncate text-xs font-medium text-zinc-500">
                  {previewTemplate.email.subject || "(No Subject)"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {previewTemplate.email.html && (
                  <div className="mr-2 flex items-center rounded-lg border border-border bg-zinc-200/70 p-1">
                    <button
                      type="button"
                      onClick={() => setModalViewport("desktop")}
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        modalViewport === "desktop"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      )}
                      title="Desktop preview"
                    >
                      <Monitor className="size-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewport("mobile")}
                      className={cn(
                        "rounded-md p-1.5 transition-colors",
                        modalViewport === "mobile"
                          ? "bg-card text-foreground shadow-sm"
                          : "text-muted-foreground"
                      )}
                      title="Mobile preview"
                    >
                      <Smartphone className="size-4" />
                    </button>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    onLoadTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="h-9 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Mail className="mr-1.5 size-4" />
                  <span>Use in Compose</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="rounded-lg p-2 text-zinc-400 transition-colors hover:text-zinc-700"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex flex-1 justify-center overflow-auto bg-zinc-100 p-8">
              <div
                className={cn(
                  "overflow-hidden rounded-xl border border-border bg-white shadow-md transition-all duration-200",
                  modalViewport === "mobile" ? "w-[375px]" : "w-full"
                )}
              >
                {previewTemplate.email.html ? (
                  <iframe
                    srcDoc={previewTemplate.email.html}
                    sandbox="allow-same-origin"
                    className="block min-h-[550px] w-full border-0"
                    title="Modal preview"
                  />
                ) : (
                  <pre className="p-8 font-mono text-sm leading-relaxed whitespace-pre-wrap text-zinc-800">
                    {previewTemplate.email.body}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </ViewShell>
  );
};
