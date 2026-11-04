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
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";

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
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
      {/* Streamlined Toolbar (when templates exist) */}
      {templates.length > 0 && (
        <div className="h-14 px-8 border-b border-border bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="relative w-80">
              <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search templates by name or subject…"
                className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-zinc-50 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white transition-colors"
              />
            </div>
            <span className="text-xs font-medium text-zinc-500">
              {filteredTemplates.length === templates.length
                ? `${templates.length} saved ${templates.length === 1 ? "template" : "templates"}`
                : `Showing ${filteredTemplates.length} of ${templates.length} templates`}
            </span>
          </div>
        </div>
      )}

      {/* Grid or Centered Empty State */}
      {templates.length === 0 || filteredTemplates.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
            <FileText className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800">
            {search ? "No matching templates" : "No templates saved yet"}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mt-1">
            {search
              ? `No templates matched "${search}". Try searching with a different keyword.`
              : "Draft an email in Compose and click \"Save as Template\" in the bottom dock to reuse it anytime."}
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start max-w-7xl mx-auto">
            {filteredTemplates.map((tmpl) => {
              const hasHtml = !!tmpl.email.html?.trim();
              const hasPlain = !!tmpl.email.body?.trim();
              const hasAttachments = tmpl.email.attachments?.length > 0;

              return (
                <div
                  key={tmpl.id}
                  className="rounded-xl border border-border bg-white shadow-2xs overflow-hidden flex flex-col hover:shadow-sm transition-shadow group"
                >
                  {/* Card Title & Tags */}
                  <div className="p-5 border-b border-border bg-zinc-50/60">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1 pr-3">
                        <h3 className="text-sm font-bold text-zinc-900 truncate">
                          {tmpl.name}
                        </h3>
                        <p className="text-xs text-zinc-500 font-medium truncate mt-1">
                          {tmpl.email.subject || "(No Subject)"}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-400 font-mono shrink-0">
                        {new Date(tmpl.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {hasHtml && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200">
                          HTML
                        </span>
                      )}
                      {hasPlain && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                          Plain Text
                        </span>
                      )}
                      {hasAttachments && (
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                          📎 {tmpl.email.attachments.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Visual Preview Box */}
                  <div
                    onClick={() => setPreviewTemplate(tmpl)}
                    className="h-40 bg-zinc-100/70 p-3 cursor-pointer border-b border-border relative overflow-hidden group/preview"
                    title="Click to expand full preview"
                  >
                    <div className="w-full h-full bg-white rounded-lg border border-border overflow-hidden pointer-events-none">
                      {hasHtml ? (
                        <iframe
                          srcDoc={`<style>*{margin:0;padding:0;box-sizing:border-box;}body{transform:scale(0.65);transform-origin:top left;width:155%;overflow:hidden;}</style>${tmpl.email.html}`}
                          sandbox="allow-same-origin"
                          scrolling="no"
                          className="w-full h-full border-0 block"
                          title={tmpl.name}
                        />
                      ) : (
                        <p className="p-3 text-xs font-mono text-zinc-600 line-clamp-5 leading-relaxed">
                          {tmpl.email.body || "Empty body"}
                        </p>
                      )}
                    </div>

                    <div className="absolute inset-0 bg-zinc-900/15 opacity-0 group-hover/preview:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs font-bold bg-white text-zinc-900 px-3 py-1.5 rounded-lg shadow-sm flex items-center gap-1.5">
                        <Eye className="w-4 h-4" />
                        <span>Preview Template</span>
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3.5 bg-white flex items-center gap-2 justify-between">
                    <Button
                      size="sm"
                      onClick={() => onLoadTemplate(tmpl)}
                      className="flex-1 h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                    >
                      <Mail className="w-4 h-4 mr-1.5" />
                      <span>Use in Compose</span>
                    </Button>
                    <button
                      type="button"
                      onClick={() => onDeleteTemplate(tmpl.id)}
                      className="p-2 text-zinc-400 hover:text-red-600 rounded transition-colors"
                      title="Delete template"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Expanded Preview Modal */}
      {previewTemplate && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-zinc-900/50 backdrop-blur-xs animate-fade-in"
          onClick={() => setPreviewTemplate(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-border w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="h-16 px-6 border-b border-border flex items-center justify-between bg-zinc-50 shrink-0">
              <div className="min-w-0 pr-4">
                <h3 className="text-base font-bold text-zinc-900 truncate">
                  {previewTemplate.name}
                </h3>
                <p className="text-xs text-zinc-500 font-medium truncate mt-0.5">
                  {previewTemplate.email.subject || "(No Subject)"}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {previewTemplate.email.html && (
                  <div className="flex items-center bg-zinc-200/70 p-1 rounded-lg border border-border mr-2">
                    <button
                      type="button"
                      onClick={() => setModalViewport("desktop")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        modalViewport === "desktop"
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-500"
                      )}
                      title="Desktop preview"
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setModalViewport("mobile")}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        modalViewport === "mobile"
                          ? "bg-white text-zinc-900 shadow-xs"
                          : "text-zinc-500"
                      )}
                      title="Mobile preview"
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <Button
                  size="sm"
                  onClick={() => {
                    onLoadTemplate(previewTemplate);
                    setPreviewTemplate(null);
                  }}
                  className="h-9 px-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Mail className="w-4 h-4 mr-1.5" />
                  <span>Use in Compose</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setPreviewTemplate(null)}
                  className="p-2 text-zinc-400 hover:text-zinc-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto bg-zinc-100 p-8 flex justify-center">
              <div
                className={cn(
                  "bg-white rounded-xl border border-border shadow-md overflow-hidden transition-all duration-200",
                  modalViewport === "mobile" ? "w-[375px]" : "w-full"
                )}
              >
                {previewTemplate.email.html ? (
                  <iframe
                    srcDoc={previewTemplate.email.html}
                    sandbox="allow-same-origin"
                    className="w-full min-h-[550px] border-0 block"
                    title="Modal preview"
                  />
                ) : (
                  <pre className="p-8 font-mono text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {previewTemplate.email.body}
                  </pre>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
