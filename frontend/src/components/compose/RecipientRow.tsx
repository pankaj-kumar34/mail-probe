import React from "react";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";

interface RecipientRowProps {
  label: string;
  recipients: string[];
  placeholder: string;
  onAdd: (val: string) => void;
  onRemove: (index: number) => void;
  onPaste: (rawText: string) => void;
  listId?: string;
  accent?: boolean;
  onClearField?: () => void;
  clearTitle?: string;
  trailingActions?: React.ReactNode;
}

/** Reusable recipient chip-input row shared by To, Cc, and Bcc fields. */
export const RecipientRow: React.FC<RecipientRowProps> = ({
  label,
  recipients,
  placeholder,
  onAdd,
  onRemove,
  onPaste,
  listId,
  accent = false,
  onClearField,
  clearTitle,
  trailingActions,
}) => {
  const cleanList = recipients.filter((t) => t.trim());

  const commitInput = (input: HTMLInputElement) => {
    const val = input.value.trim().replace(/[,;]$/, "");
    if (val) {
      onAdd(val);
      input.value = "";
    }
  };

  return (
    <div
      className={cn(
        "flex min-h-11 items-start gap-3 border-b border-border px-5 py-2.5",
        !accent && "bg-muted/30"
      )}
    >
      <span
        className={cn(
          "mt-1.5 w-20 shrink-0 text-xs",
          accent
            ? "font-bold tracking-wider text-emerald-700 uppercase"
            : "font-semibold text-muted-foreground"
        )}
      >
        {label}
      </span>

      <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5 pt-0.5">
        {cleanList.map((addr, idx) => (
          <span
            key={idx}
            className={cn(
              "inline-flex animate-scale-in items-center gap-1.5 rounded-md border px-2.5 py-0.5 font-mono text-xs font-medium",
              accent
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : "border-border bg-muted text-foreground"
            )}
          >
            <span>{addr}</span>
            <button
              type="button"
              onClick={() => onRemove(idx)}
              className={cn(
                "rounded-sm",
                accent
                  ? "text-emerald-600 hover:text-emerald-950"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}

        <input
          type="text"
          list={listId}
          placeholder={placeholder}
          className="min-w-50 flex-1 bg-transparent py-1 font-mono text-[13px] text-foreground outline-none placeholder:font-sans placeholder:text-muted-foreground"
          onKeyDown={(e) => {
            const input = e.target as HTMLInputElement;
            if (
              (e.key === "Enter" || e.key === "," || e.key === "Tab") &&
              input.value.trim()
            ) {
              e.preventDefault();
              commitInput(input);
            } else if (
              e.key === "Backspace" &&
              !input.value &&
              recipients.length > 0
            ) {
              onRemove(recipients.length - 1);
            }
          }}
          onPaste={(e) => {
            e.preventDefault();
            onPaste(e.clipboardData.getData("text"));
          }}
          onBlur={(e) => commitInput(e.target)}
        />
      </div>

      {trailingActions}

      {onClearField && (
        <button
          type="button"
          onClick={onClearField}
          className="mt-0.5 shrink-0 p-1 text-muted-foreground hover:text-foreground"
          title={clearTitle}
        >
          <X className="size-3.5" />
        </button>
      )}
    </div>
  );
};
