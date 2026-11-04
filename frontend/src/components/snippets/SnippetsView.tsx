import React, { useState } from "react";
import {
  Bookmark,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  Send,
  X,
} from "lucide-react";
import { SnippetGroup, SnippetItem } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import { SnippetInsertButton } from "./SnippetInsertButton";
import { SnippetTarget } from "../../lib/snippetUtils";

interface SnippetsViewProps {
  groups: SnippetGroup[];
  onAddGroup: () => void;
  onUpdateGroup: (id: string, changes: Partial<SnippetGroup>) => void;
  onDeleteGroup: (id: string) => void;
  onInsertToCompose?: (text: string, targetField: SnippetTarget) => void;
}

export const SnippetsView: React.FC<SnippetsViewProps> = ({
  groups,
  onAddGroup,
  onUpdateGroup,
  onDeleteGroup,
  onInsertToCompose,
}) => {
  const [search, setSearch] = useState("");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyValue = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const addItemToGroup = (groupId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    const newItem: SnippetItem = {
      id: crypto.randomUUID(),
      value: "",
    };
    onUpdateGroup(groupId, { items: [...group.items, newItem] });
  };

  const updateItemValue = (groupId: string, itemId: string, value: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    onUpdateGroup(groupId, {
      items: group.items.map((i) => (i.id === itemId ? { ...i, value } : i)),
    });
  };

  const deleteItem = (groupId: string, itemId: string) => {
    const group = groups.find((g) => g.id === groupId);
    if (!group) return;
    onUpdateGroup(groupId, {
      items: group.items.filter((i) => i.id !== itemId),
    });
  };

  const filteredGroups = groups
    .map((g) => {
      if (!search.trim()) return g;
      const q = search.toLowerCase();
      const matchingItems = g.items.filter((i) =>
        i.value.toLowerCase().includes(q)
      );
      const groupMatches = g.name.toLowerCase().includes(q);
      return {
        ...g,
        items: groupMatches ? g.items : matchingItems,
      };
    })
    .filter(
      (g) =>
        !search.trim() ||
        g.items.length > 0 ||
        g.name.toLowerCase().includes(search.toLowerCase())
    );

  const totalSnippets = groups.reduce(
    (acc, g) => acc + g.items.filter((i) => i.value.trim()).length,
    0
  );

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
      {/* Top Controls Bar */}
      <div className="h-14 px-8 border-b border-border bg-white flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippet values and categories…"
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-border bg-zinc-50 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 focus:border-emerald-500 focus:bg-white transition-colors"
            />
          </div>
          <span className="text-xs font-medium text-zinc-500">
            {totalSnippets} snippets across {groups.length} categories
          </span>
        </div>

        <Button
          size="sm"
          onClick={onAddGroup}
          className="h-9 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
        >
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          <span>New Category</span>
        </Button>
      </div>

      {/* Snippet Card Grid or Centered Empty State */}
      {filteredGroups.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
            <Bookmark className="w-7 h-7 stroke-[1.5]" />
          </div>
          <h3 className="text-base font-semibold text-zinc-800">
            {search ? "No matching snippets" : "No snippets in library"}
          </h3>
          <p className="text-sm text-zinc-500 max-w-sm mt-1">
            {search
              ? `No snippets matched "${search}". Try searching with a different term.`
              : "Create categories to store quick-insert recipient addresses, subject lines, or payload templates."}
          </p>
          <Button
            size="sm"
            onClick={search ? () => setSearch("") : onAddGroup}
            className="mt-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
          >
            {search ? (
              "Clear search"
            ) : (
              <>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Create Category</span>
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 items-start max-w-7xl mx-auto">
            {filteredGroups.map((group) => {
              const activeCount = group.items.filter((i) => i.value.trim()).length;
              return (
                <div
                  key={group.id}
                  className="rounded-xl border border-border bg-white shadow-2xs overflow-hidden flex flex-col hover:shadow-sm transition-shadow"
                >
                  {/* Card Header */}
                  <div className="px-5 py-3.5 border-b border-border bg-zinc-50/70 flex items-center justify-between">
                    <div className="flex items-center gap-2.5 min-w-0 flex-1 pr-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          onUpdateGroup(group.id, { name: e.target.value })
                        }
                        placeholder="Category name…"
                        className="text-sm font-bold text-zinc-900 bg-transparent outline-none truncate w-full focus:bg-white focus:px-1.5 rounded"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-0.5 font-semibold"
                      >
                        {activeCount}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => addItemToGroup(group.id)}
                        className="p-1 rounded text-zinc-400 hover:text-emerald-700 hover:bg-zinc-200/60 transition-colors"
                        title="Add item"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(group.id)}
                        className="p-1 rounded text-zinc-400 hover:text-red-600 hover:bg-zinc-200/60 transition-colors"
                        title="Delete group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Card Items */}
                  <div className="p-3 space-y-2 max-h-96 overflow-y-auto">
                    {group.items.length === 0 ? (
                      <div className="py-5 text-center text-xs text-zinc-400">
                        <button
                          type="button"
                          onClick={() => addItemToGroup(group.id)}
                          className="text-emerald-600 hover:underline font-semibold"
                        >
                          + Add first snippet
                        </button>
                      </div>
                    ) : (
                      group.items.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 p-2 rounded-lg border border-border/80 hover:border-zinc-300 bg-zinc-50/50 hover:bg-white transition-all group/item"
                        >
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) =>
                              updateItemValue(group.id, item.id, e.target.value)
                            }
                            placeholder="Type or paste payload value…"
                            className="flex-1 text-sm font-mono text-zinc-900 bg-transparent outline-none px-1.5 min-w-0"
                          />

                          <div className="flex items-center gap-1.5 shrink-0">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => copyValue(item.id, item.value)}
                              disabled={!item.value.trim()}
                              className={cn(
                                "flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold transition-colors",
                                copiedId === item.id
                                  ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                                  : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/70"
                              )}
                              title="Copy value"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>

                            {/* Insert directly into Compose with target selection */}
                            {onInsertToCompose && item.value.trim() && (
                              <SnippetInsertButton
                                value={item.value}
                                groupName={group.name}
                                onInsert={onInsertToCompose}
                              />
                            )}

                            <button
                              type="button"
                              onClick={() => deleteItem(group.id, item.id)}
                              className="p-1 text-zinc-300 hover:text-red-500 rounded opacity-0 group-hover/item:opacity-100 transition-opacity"
                              title="Delete snippet"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="p-2.5 border-t border-zinc-100 bg-zinc-50/50">
                    <button
                      type="button"
                      onClick={() => addItemToGroup(group.id)}
                      className="w-full py-1.5 rounded text-xs font-semibold text-zinc-600 hover:text-zinc-900 hover:bg-zinc-200/50 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Snippet</span>
                    </button>
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
