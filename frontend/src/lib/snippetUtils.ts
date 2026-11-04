export type SnippetTarget =
  | "to"
  | "cc"
  | "bcc"
  | "replyTo"
  | "subject"
  | "body";

/**
 * Automatically infers which email field a snippet belongs to
 * based on the parent group name and/or content characteristics.
 */
export function detectSnippetTarget(
  groupName: string = "",
  value: string = ""
): SnippetTarget {
  const g = groupName.toLowerCase();

  // 1. Group Name heuristics
  if (
    g.includes("subject") ||
    g.includes("title") ||
    g.includes("header") ||
    g.includes("topic")
  ) {
    return "subject";
  }
  if (
    g.includes("html") ||
    g.includes("body") ||
    g.includes("content") ||
    g.includes("message") ||
    g.includes("payload") ||
    g.includes("text") ||
    g.includes("template") ||
    g.includes("signature") ||
    g.includes("footer")
  ) {
    return "body";
  }
  if (g.includes("bcc")) {
    return "bcc";
  }
  if (g.includes("reply-to") || g.includes("reply to") || g.includes("replyto")) {
    return "replyTo";
  }
  if (/\bcc\b/.test(g)) {
    return "cc";
  }
  if (
    g.includes("recipient") ||
    g.includes("email") ||
    g.includes("contact") ||
    g.includes("address") ||
    g.includes("to")
  ) {
    return "to";
  }

  // 2. Content heuristics
  const trimmed = value.trim();
  if (
    trimmed.startsWith("<") &&
    (trimmed.endsWith(">") || trimmed.includes("</") || trimmed.includes("/>"))
  ) {
    return "body";
  }
  if (trimmed.includes("\n") || trimmed.length > 100) {
    return "body";
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "to";
  }

  // Default fallback
  return "to";
}
