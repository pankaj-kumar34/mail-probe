import React from "react";
import {
  Bookmark,
  FileText,
  Eraser,
  Mail,
  Server,
  Activity,
  History,
  Plus,
  LucideIcon,
} from "lucide-react";
import { View } from "../../types";
import { Button } from "../ui/button";
import { cn } from "../../lib/utils";

interface HeaderBarProps {
  currentView: View;
  onToggleDrawer: (tab: "snippets" | "templates") => void;
  isDrawerOpen: boolean;
  drawerTab: "snippets" | "templates" | null;
  onNewEmail?: () => void;
  onAddServer?: () => void;
}

const VIEW_META: Record<View, { title: string; icon: LucideIcon }> = {
  compose: { title: "Compose Email", icon: Mail },
  servers: { title: "Servers", icon: Server },
  diagnostics: { title: "Protocol Inspector", icon: Activity },
  templates: { title: "Email Templates", icon: FileText },
  snippets: { title: "Snippets Library", icon: Bookmark },
  history: { title: "Delivery History", icon: History },
};

export const HeaderBar: React.FC<HeaderBarProps> = ({
  currentView,
  onToggleDrawer,
  isDrawerOpen,
  drawerTab,
  onNewEmail,
  onAddServer,
}) => {
  const { title, icon: ViewIcon } = VIEW_META[currentView];

  return (
    <header className="z-10 flex h-16 shrink-0 items-center justify-between border-b border-border bg-card px-6 select-none">
      {/* View Title */}
      <div className="flex items-center gap-2.5">
        <ViewIcon className="size-4 shrink-0 text-emerald-600" />
        <h1 className="text-sm font-bold tracking-tight text-foreground">
          {title}
        </h1>
      </div>

      {/* Right Controls: Compose Icon-Only Ghost Actions */}
      {currentView === "compose" && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleDrawer("snippets")}
            className={cn(
              "size-8",
              isDrawerOpen && drawerTab === "snippets"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Snippets"
            aria-label="Toggle Snippets Drawer"
          >
            <Bookmark className="size-4" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleDrawer("templates")}
            className={cn(
              "size-8",
              isDrawerOpen && drawerTab === "templates"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            )}
            title="Templates"
            aria-label="Toggle Templates Drawer"
          >
            <FileText className="size-4" />
          </Button>

          {onNewEmail && (
            <>
              <div className="mx-1 h-4 w-px bg-border" />
              <Button
                variant="ghost"
                size="icon"
                className="size-8 text-muted-foreground hover:bg-red-50 hover:text-red-600"
                onClick={onNewEmail}
                title="Clear draft"
                aria-label="Clear draft"
              >
                <Eraser className="size-4" />
              </Button>
            </>
          )}
        </div>
      )}

      {/* Right Controls: Servers Quick Action */}
      {currentView === "servers" && onAddServer && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onAddServer}
          className="h-8 gap-1.5 px-2.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          title="New Server"
        >
          <Plus className="size-3.5" />
          <span>New Server</span>
        </Button>
      )}
    </header>
  );
};
