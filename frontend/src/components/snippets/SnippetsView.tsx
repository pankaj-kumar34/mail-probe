import React, { useState } from "react";
import {
  Bookmark,
  Plus,
  Trash2,
  Copy,
  Check,
  Search,
  X,
} from "lucide-react";
import { SnippetGroup, SnippetItem } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { cn } from "../../lib/utils";
import {
  ViewShell,
  ViewToolbar,
  ViewContent,
  ViewEmptyState,
} from "../layout/PageContainer";
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
    <ViewShell>
      {/* Top Controls Bar */}
      <ViewToolbar>
        <div className="flex items-center gap-4">
          <div className="relative w-80">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search snippet values and categories…"
              className="h-8 w-full rounded-lg border border-border bg-background pr-3 pl-9 text-[13px] text-foreground transition-colors outline-none placeholder:text-muted-foreground focus:border-emerald-500 focus:bg-card"
            />
          </div>
          <span className="text-xs font-medium text-muted-foreground">
            {totalSnippets} snippets across {groups.length} categories
          </span>
        </div>

        <Button
          size="sm"
          onClick={onAddGroup}
          className="h-8 bg-emerald-600 px-3 text-xs font-semibold text-white hover:bg-emerald-700"
        >
          <Plus className="mr-1.5 size-3.5" />
          <span>New Category</span>
        </Button>
      </ViewToolbar>

      {/* Snippet Card Grid or Centered Empty State */}
      {filteredGroups.length === 0 ? (
        <ViewEmptyState
          icon={Bookmark}
          title={search ? "No matching snippets" : "No snippets in library"}
          description={
            search
              ? `No snippets matched "${search}". Try searching with a different term.`
              : "Create categories to store quick-insert recipient addresses, subject lines, or payload templates."
          }
          action={
            <Button
              size="sm"
              onClick={search ? () => setSearch("") : onAddGroup}
              className="h-9 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              {search ? (
                "Clear search"
              ) : (
                <>
                  <Plus className="mr-1.5 size-3.5" />
                  <span>Create Category</span>
                </>
              )}
            </Button>
          }
        />
      ) : (
        <ViewContent maxWidth="6xl">
          <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredGroups.map((group) => {
              const activeCount = group.items.filter((i) => i.value.trim()).length;
              return (
                <div
                  key={group.id}
                  className="flex flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-border bg-muted/50 px-3.5 py-2.5">
                    <div className="flex min-w-0 flex-1 items-center gap-2 pr-2">
                      <span className="size-2 shrink-0 rounded-full bg-emerald-500" />
                      <input
                        type="text"
                        value={group.name}
                        onChange={(e) =>
                          onUpdateGroup(group.id, { name: e.target.value })
                        }
                        placeholder="Category name…"
                        className="w-full truncate rounded bg-transparent text-xs font-bold text-foreground outline-none focus:bg-card focus:px-1.5"
                      />
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <Badge
                        variant="secondary"
                        className="px-1.5 py-0 text-[11px] font-semibold"
                      >
                        {activeCount}
                      </Badge>
                      <button
                        type="button"
                        onClick={() => addItemToGroup(group.id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-emerald-700"
                        title="Add item"
                      >
                        <Plus className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteGroup(group.id)}
                        className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-red-600"
                        title="Delete group"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Card Items */}
                  <div className="max-h-80 space-y-1.5 overflow-y-auto p-2.5">
                    {group.items.length === 0 ? (
                      <div className="py-4 text-center text-xs text-muted-foreground">
                        <button
                          type="button"
                          onClick={() => addItemToGroup(group.id)}
                          className="font-semibold text-emerald-600 hover:underline"
                        >
                          + Add first snippet
                        </button>
                      </div>
                    ) : (
                      group.items.map((item) => (
                        <div
                          key={item.id}
                          className="group/item flex items-center gap-1.5 rounded-lg border border-border/80 bg-background px-2 py-1 transition-all hover:border-zinc-300 hover:bg-card"
                        >
                          <input
                            type="text"
                            value={item.value}
                            onChange={(e) =>
                              updateItemValue(group.id, item.id, e.target.value)
                            }
                            placeholder="Type or paste payload value…"
                            className="min-w-0 flex-1 bg-transparent px-1 font-mono text-xs text-foreground outline-none"
                          />

                          <div className="flex shrink-0 items-center gap-1">
                            {/* Copy button */}
                            <button
                              type="button"
                              onClick={() => copyValue(item.id, item.value)}
                              disabled={!item.value.trim()}
                              className={cn(
                                "flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-semibold transition-colors",
                                copiedId === item.id
                                  ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              )}
                              title="Copy value"
                            >
                              {copiedId === item.id ? (
                                <>
                                  <Check className="size-3 text-emerald-600" />
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="size-3" />
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
                              className="rounded p-0.5 text-zinc-300 opacity-0 transition-opacity group-hover/item:opacity-100 hover:text-red-500"
                              title="Delete snippet"
                            >
                              <X className="size-3" />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="border-t border-border/60 bg-muted/30 p-1.5">
                    <button
                      type="button"
                      onClick={() => addItemToGroup(group.id)}
                      className="flex w-full items-center justify-center gap-1 rounded py-1 text-[11px] font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Plus className="size-3" />
                      <span>Add Snippet</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </ViewContent>
      )}
    </ViewShell>
  );
};
