import { SMTPConfig } from "../bindings/mail-probe/models";

export interface ServerProfile {
  id: string;
  name: string;
  server: string;
  port: number;
  username: string;
  password: string;
  authType: string;
  startTLS: boolean;
  skipVerify: boolean;
}

export interface EmailReq {
  from: string;
  fromName: string;
  replyTo: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  body: string;
  html: string;
  attachments: string[];
}

export interface Result {
  success: boolean;
  message: string;
  serverBanner?: string;
  queueId?: string;
  duration?: string;
  log?: string;
}

export interface SnippetItem {
  id: string;
  value: string;
}

export interface SnippetGroup {
  id: string;
  name: string;
  items: SnippetItem[];
  createdAt: number;
  color?: string;
  x?: number;
  y?: number;
  width?: number;
}

export interface EmailTemplate {
  id: string;
  name: string;
  createdAt: number;
  email: EmailReq;
}

export interface SentEmail {
  id: string;
  sentAt: number;
  server: string;
  email: EmailReq;
  result: Result;
}

export interface LogEntry {
  id: string;
  time: string;
  timestamp: number;
  server: string;
  action: "test" | "send";
  ok: boolean;
  msg: string;
  duration?: string;
  log?: string;
}

export interface AppData {
  profiles: ServerProfile[];
  activeId: string;
  snippets: SnippetGroup[];
  templates: EmailTemplate[];
  sentHistory: SentEmail[];
  draft: Partial<EmailReq>;
  testStatus: Record<string, boolean>;
  history: Record<string, string[]>;
}

export type View =
  | "compose"
  | "servers"
  | "diagnostics"
  | "templates"
  | "snippets"
  | "history";

export const toSMTPConfig = (p: ServerProfile): SMTPConfig => ({
  server: p.server,
  port: p.port,
  username: p.username,
  password: p.password,
  authType: p.authType,
  startTLS: p.startTLS,
  skipVerify: p.skipVerify,
});

export const EMPTY_DATA: AppData = {
  profiles: [],
  activeId: "",
  snippets: [],
  templates: [],
  sentHistory: [],
  draft: {},
  testStatus: {},
  history: {},
};

export const DEFAULT_SNIPPETS: SnippetGroup[] = [
  {
    id: "group-test-recipients",
    name: "Test Recipients",
    createdAt: Date.now(),
    color: "emerald",
    items: [
      { id: "item-1", value: "test@example.com" },
      { id: "item-2", value: "dev-null@mailprobe.local" },
      { id: "item-3", value: "inbox-testing@mailpit.local" },
    ],
  },
  {
    id: "group-test-subjects",
    name: "Diagnostic Subjects",
    createdAt: Date.now(),
    color: "blue",
    items: [
      { id: "item-4", value: "[TEST] Mail Probe Delivery Verification" },
      { id: "item-5", value: "SMTP Probe: Character Encoding Test • 🚀 汉字 €100" },
      { id: "item-6", value: "URGENT: SMTP Protocol Diagnostic Ping" },
    ],
  },
  {
    id: "group-html-snippets",
    name: "HTML Snippets",
    createdAt: Date.now(),
    color: "purple",
    items: [
      {
        id: "item-7",
        value: `<div style="font-family: sans-serif; padding: 20px; background: #f9fafb; border-radius: 8px;">\n  <h2 style="color: #059669; margin-top: 0;">Mail Probe Verified ✓</h2>\n  <p style="color: #374151;">This message confirms your SMTP routing pipeline is fully operational.</p>\n</div>`,
      },
      {
        id: "item-8",
        value: `<table width="100%" cellpadding="12" style="border: 1px solid #e5e7eb; border-radius: 6px; font-family: monospace; font-size: 13px;">\n  <tr style="background: #f3f4f6;"><th>Key</th><th>Value</th></tr>\n  <tr><td>Timestamp</td><td>${new Date().toISOString()}</td></tr>\n  <tr><td>Engine</td><td>Mail Probe Go Runtime</td></tr>\n</table>`,
      },
    ],
  },
];
