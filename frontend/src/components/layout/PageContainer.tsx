import React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

interface ViewShellProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard outer wrapper for every main content view. */
export const ViewShell: React.FC<ViewShellProps> = ({ children, className }) => (
  <div
    className={cn(
      "flex h-full flex-1 flex-col overflow-hidden bg-background",
      className
    )}
  >
    {children}
  </div>
);

interface ViewToolbarProps {
  children: React.ReactNode;
  className?: string;
}

/** Standard 48px sub-header / toolbar bar shared across views. */
export const ViewToolbar: React.FC<ViewToolbarProps> = ({
  children,
  className,
}) => (
  <div
    className={cn(
      "flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border bg-card px-6",
      className
    )}
  >
    {children}
  </div>
);

interface ViewContentProps {
  children: React.ReactNode;
  maxWidth?: "5xl" | "6xl" | "full";
  className?: string;
  scrollClassName?: string;
}

const MAX_WIDTH_MAP = {
  "5xl": "max-w-5xl",
  "6xl": "max-w-6xl",
  full: "max-w-none",
} as const;

/** Standard scrollable content area with consistent padding and max-width. */
export const ViewContent: React.FC<ViewContentProps> = ({
  children,
  maxWidth = "6xl",
  className,
  scrollClassName,
}) => (
  <div className={cn("flex-1 overflow-y-auto p-6", scrollClassName)}>
    <div className={cn("mx-auto w-full", MAX_WIDTH_MAP[maxWidth], className)}>
      {children}
    </div>
  </div>
);

interface ViewEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

/** Standard centered empty state across all views. */
export const ViewEmptyState: React.FC<ViewEmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  className,
}) => (
  <div
    className={cn(
      "flex flex-1 flex-col items-center justify-center p-8 text-center",
      className
    )}
  >
    <div className="mb-3 flex size-12 items-center justify-center rounded-xl bg-muted text-muted-foreground">
      <Icon className="size-6" strokeWidth={1.5} />
    </div>
    <h3 className="text-sm font-semibold text-foreground">{title}</h3>
    <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
    {action && <div className="mt-4">{action}</div>}
  </div>
);
