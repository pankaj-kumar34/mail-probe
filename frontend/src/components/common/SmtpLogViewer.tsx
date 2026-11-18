import React from "react";
import { parseSmtpLog } from "../../lib/smtpParser";
import { cn } from "../../lib/utils";

interface SmtpLogViewerProps {
  log: string;
  showLineNumbers?: boolean;
  className?: string;
}

/** Shared syntax-colored SMTP protocol transcript viewer. */
export const SmtpLogViewer: React.FC<SmtpLogViewerProps> = ({
  log,
  showLineNumbers = true,
  className,
}) => {
  const parsedLog = parseSmtpLog(log);

  return (
    <div className={cn("space-y-1 font-mono text-xs leading-relaxed", className)}>
      {parsedLog.map((line, idx) => (
        <div
          key={idx}
          className={cn(
            "flex items-start gap-3 rounded px-2.5 py-0.5 transition-colors hover:bg-zinc-900",
            line.direction === "client" && "font-medium text-cyan-400",
            line.direction === "server" &&
              (line.code?.startsWith("5")
                ? "bg-red-950/20 font-bold text-red-400"
                : line.code?.startsWith("2")
                  ? "text-emerald-400"
                  : "text-amber-300"),
            line.direction === "error" &&
              "bg-red-950/30 font-bold text-red-400",
            line.direction === "system" && "text-zinc-400 italic"
          )}
        >
          {showLineNumbers && (
            <span className="w-7 shrink-0 text-right text-zinc-600 select-none">
              {idx + 1}
            </span>
          )}
          <span className="w-3 shrink-0 font-bold text-zinc-500 select-none">
            {line.direction === "client"
              ? ">"
              : line.direction === "server"
                ? "<"
                : "•"}
          </span>
          <span className="flex-1 break-all">{line.text}</span>
        </div>
      ))}
    </div>
  );
};
