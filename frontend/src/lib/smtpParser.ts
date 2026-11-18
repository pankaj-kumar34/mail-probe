export interface SmtpLogLine {
  direction: "client" | "server" | "system" | "error";
  code?: string;
  text: string;
}

export function parseSmtpLog(rawLog?: string): SmtpLogLine[] {
  if (!rawLog) return [];
  const lines = rawLog.split("\n");
  const result: SmtpLogLine[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    if (trimmed.startsWith("> ") || trimmed.startsWith("CLIENT: ") || trimmed.startsWith(">> ")) {
      result.push({
        direction: "client",
        text: trimmed.replace(/^(> |CLIENT: |>> )/, ""),
      });
    } else if (trimmed.startsWith("< ") || trimmed.startsWith("SERVER: ") || trimmed.startsWith("<< ")) {
      const content = trimmed.replace(/^(< |SERVER: |<< )/, "");
      const match = content.match(/^([0-9]{3})([- ])?(.*)$/);
      if (match) {
        result.push({
          direction: "server",
          code: match[1],
          text: content,
        });
      } else {
        result.push({
          direction: "server",
          text: content,
        });
      }
    } else if (
      trimmed.toLowerCase().includes("error") ||
      trimmed.toLowerCase().includes("failed") ||
      trimmed.toLowerCase().includes("fatal")
    ) {
      result.push({
        direction: "error",
        text: trimmed,
      });
    } else {
      result.push({
        direction: "system",
        text: trimmed,
      });
    }
  }

  return result;
}
