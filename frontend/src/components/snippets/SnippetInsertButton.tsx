import React from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import {
  Send,
  ChevronDown,
  Mail,
  Users,
  EyeOff,
  Reply,
  FileText,
  AlignLeft,
} from "lucide-react";
import { detectSnippetTarget, SnippetTarget } from "../../lib/snippetUtils";
import { cn } from "../../lib/utils";

interface SnippetInsertButtonProps {
  value: string;
  groupName: string;
  onInsert: (value: string, target: SnippetTarget) => void;
  className?: string;
}

const TARGET_SECTIONS: {
  title: string;
  items: {
    id: SnippetTarget;
    label: string;
    desc: string;
    icon: React.ComponentType<{ className?: string }>;
  }[];
}[] = [
  {
    title: "Recipients",
    items: [
      {
        id: "to",
        label: "To (Recipient)",
        desc: "Add to primary recipients",
        icon: Mail,
      },
      {
        id: "cc",
        label: "Cc (Carbon Copy)",
        desc: "Add to CC recipients",
        icon: Users,
      },
      {
        id: "bcc",
        label: "Bcc (Blind Copy)",
        desc: "Add to BCC recipients",
        icon: EyeOff,
      },
      {
        id: "replyTo",
        label: "Reply-To",
        desc: "Set Reply-To header",
        icon: Reply,
      },
    ],
  },
  {
    title: "Message Content",
    items: [
      {
        id: "subject",
        label: "Subject",
        desc: "Set email subject line",
        icon: FileText,
      },
      {
        id: "body",
        label: "Body / HTML",
        desc: "Append to message content",
        icon: AlignLeft,
      },
    ],
  },
];

const TARGET_LABELS: Record<SnippetTarget, string> = {
  to: "To",
  cc: "Cc",
  bcc: "Bcc",
  replyTo: "Reply-To",
  subject: "Subject",
  body: "Body",
};

export const SnippetInsertButton: React.FC<SnippetInsertButtonProps> = ({
  value,
  groupName,
  onInsert,
  className,
}) => {
  const defaultTarget = detectSnippetTarget(groupName, value);
  const targetLabel = TARGET_LABELS[defaultTarget];

  return (
    <DropdownMenu.Root>
      <div
        className={cn(
          "relative inline-flex items-center rounded-md border border-border bg-card shadow-sm transition-colors hover:border-zinc-300",
          className
        )}
      >
        {/* Primary 1-Click Action to Default/Inferred Field */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onInsert(value, defaultTarget);
          }}
          className="flex items-center gap-1 rounded-l-md px-2 py-1 text-xs font-semibold text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-emerald-700"
          title={`Insert into ${targetLabel} (Click ▾ for all fields: To, Cc, Bcc, Reply-To, Subject, Body)`}
        >
          <Send className="size-3 text-emerald-600" />
          <span className="text-[11px] text-zinc-700">{targetLabel}</span>
        </button>

        {/* Dropdown Trigger for Target Selector */}
        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            onClick={(e) => e.stopPropagation()}
            className="rounded-r-md border-l border-zinc-200 p-1 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700 data-[state=open]:bg-zinc-100 data-[state=open]:text-zinc-800"
            title="Choose destination field (To, Cc, Bcc, Reply-To, Subject, Body)"
          >
            <ChevronDown className="size-3" />
          </button>
        </DropdownMenu.Trigger>
      </div>

      {/* Portal attaches directly to document.body, entirely outside card overflow/clipping */}
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          side="top"
          sideOffset={6}
          align="end"
          avoidCollisions={true}
          collisionPadding={10}
          className="z-50 w-56 animate-scale-in rounded-xl border border-border bg-white p-1.5 text-left shadow-2xl select-none focus:outline-none"
        >
          {TARGET_SECTIONS.map((sec, secIdx) => (
            <div
              key={sec.title}
              className={secIdx > 0 ? "mt-1 border-t border-border/80 pt-1" : ""}
            >
              <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                {sec.title}
              </div>
              <div className="space-y-0.5">
                {sec.items.map((t) => {
                  const Icon = t.icon;
                  const isDefault = t.id === defaultTarget;
                  return (
                    <DropdownMenu.Item
                      key={t.id}
                      onSelect={() => onInsert(value, t.id)}
                      className="group flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-zinc-800 transition-colors outline-none hover:bg-zinc-100 hover:text-zinc-900 focus:bg-zinc-100 focus:text-zinc-900"
                    >
                      <div className="flex min-w-0 items-center gap-2">
                        <Icon className="size-3.5 shrink-0 text-zinc-400 transition-colors group-hover:text-emerald-600" />
                        <span className="truncate font-medium">{t.label}</span>
                      </div>
                      {isDefault && (
                        <span className="ml-1 shrink-0 rounded border border-emerald-200 bg-emerald-50 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600">
                          Auto
                        </span>
                      )}
                    </DropdownMenu.Item>
                  );
                })}
              </div>
            </div>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
};
