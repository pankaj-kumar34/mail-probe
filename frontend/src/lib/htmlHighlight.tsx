import React from "react";

/**
 * Lightweight, dependency-free HTML syntax highlighter returning React nodes.
 * Handles comments, doctypes, tags, attribute names, and quoted attribute values.
 */
export function highlightHtml(code: string): React.ReactNode[] {
  if (!code) return [];

  const tokens: React.ReactNode[] = [];
  // Match comments, doctype, or opening/closing/self-closing tags
  const tagOrCommentRegex = /(<!--[\s\S]*?-->|<!DOCTYPE[^>]*>|<\/?[a-zA-Z0-9:-]+(?:\s+[^<>]*?)?\/?>)/gi;
  let lastIndex = 0;
  let key = 0;

  let match: RegExpExecArray | null;
  while ((match = tagOrCommentRegex.exec(code)) !== null) {
    if (match.index > lastIndex) {
      tokens.push(
        <span key={key++} className="text-foreground">
          {code.slice(lastIndex, match.index)}
        </span>
      );
    }

    const raw = match[0];
    if (raw.startsWith("<!--")) {
      tokens.push(
        <span key={key++} className="text-zinc-400 italic">
          {raw}
        </span>
      );
    } else if (raw.toUpperCase().startsWith("<!DOCTYPE")) {
      tokens.push(
        <span key={key++} className="font-medium text-zinc-500">
          {raw}
        </span>
      );
    } else {
      tokens.push(...highlightTag(raw, () => key++));
    }

    lastIndex = tagOrCommentRegex.lastIndex;
  }

  if (lastIndex < code.length) {
    tokens.push(
      <span key={key++} className="text-foreground">
        {code.slice(lastIndex)}
      </span>
    );
  }

  // Trailing newline ensures <pre> height matches <textarea> when ending with \n
  if (code.endsWith("\n")) {
    tokens.push("\n");
  }

  return tokens;
}

function highlightTag(tag: string, nextKey: () => number): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const openMatch = tag.match(/^(<\/?)([a-zA-Z0-9:-]+)/);
  if (!openMatch) {
    return [
      <span key={nextKey()} className="text-foreground">
        {tag}
      </span>,
    ];
  }

  const bracket = openMatch[1];
  const tagName = openMatch[2];
  parts.push(
    <span key={nextKey()} className="text-zinc-400">
      {bracket}
    </span>,
    <span key={nextKey()} className="font-semibold text-emerald-700">
      {tagName}
    </span>
  );

  const rest = tag.slice(openMatch[0].length);
  const closeMatch = rest.match(/(\/?>)$/);
  const closeBracket = closeMatch ? closeMatch[1] : "";
  const attrBody = closeMatch ? rest.slice(0, -closeBracket.length) : rest;

  if (attrBody) {
    const attrRegex = /(\s+)([a-zA-Z0-9_:-]+)(\s*=\s*)("[^"]*"|'[^']*'|[^\s"'>]+)?/g;
    let lastAttrIdx = 0;
    let attrMatch: RegExpExecArray | null;

    while ((attrMatch = attrRegex.exec(attrBody)) !== null) {
      if (attrMatch.index > lastAttrIdx) {
        parts.push(
          <span key={nextKey()} className="text-zinc-500">
            {attrBody.slice(lastAttrIdx, attrMatch.index)}
          </span>
        );
      }

      const [, ws, attrName, eq, attrVal] = attrMatch;
      parts.push(ws);
      parts.push(
        <span key={nextKey()} className="text-amber-700">
          {attrName}
        </span>
      );
      parts.push(
        <span key={nextKey()} className="text-zinc-400">
          {eq}
        </span>
      );
      if (attrVal) {
        parts.push(
          <span key={nextKey()} className="text-sky-700">
            {attrVal}
          </span>
        );
      }
      lastAttrIdx = attrRegex.lastIndex;
    }

    if (lastAttrIdx < attrBody.length) {
      parts.push(
        <span key={nextKey()} className="text-amber-700">
          {attrBody.slice(lastAttrIdx)}
        </span>
      );
    }
  }

  if (closeBracket) {
    parts.push(
      <span key={nextKey()} className="text-zinc-400">
        {closeBracket}
      </span>
    );
  }

  return parts;
}
