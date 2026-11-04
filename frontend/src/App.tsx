import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  TestConnection,
  SendEmail,
  PickFiles,
  LoadData,
  SaveData,
} from "../bindings/mail-probe/app";
import {
  ServerProfile,
  EmailReq,
  Result,
  SnippetGroup,
  EmailTemplate,
  SentEmail,
  LogEntry,
  AppData,
  View,
  toSMTPConfig,
  EMPTY_DATA,
  DEFAULT_SNIPPETS,
} from "./types";
import { SnippetTarget } from "./lib/snippetUtils";
import { Sidebar } from "./components/layout/Sidebar";
import { HeaderBar } from "./components/layout/HeaderBar";
import { DrawerPanel } from "./components/layout/DrawerPanel";
import { ComposeView } from "./components/compose/ComposeView";
import { ServersView } from "./components/servers/ServersView";
import { DiagnosticsView } from "./components/diagnostics/DiagnosticsView";
import { SnippetsView } from "./components/snippets/SnippetsView";
import { TemplatesView } from "./components/templates/TemplatesView";
import { HistoryView } from "./components/history/HistoryView";
import { SmtpInspectorModal } from "./components/common/SmtpInspectorModal";

const t = (s: string) => s?.trim() || "";

const newProfile = (o?: Partial<ServerProfile>): ServerProfile => ({
  id: crypto.randomUUID(),
  name: "New Relay",
  server: "localhost",
  port: 1025,
  username: "",
  password: "",
  authType: "plain",
  startTLS: false,
  skipVerify: true,
  ...o,
});

const trimProfile = (p: ServerProfile): ServerProfile => ({
  ...p,
  name: t(p.name) || "Unnamed",
  server: t(p.server),
  username: t(p.username),
  password: t(p.password),
  authType: t(p.authType).toLowerCase() || "plain",
});

export default function App() {
  const [view, setView] = useState<View>("compose");
  const [dataLoaded, setDataLoaded] = useState(false);

  // Core Data State
  const [profiles, setProfiles] = useState<ServerProfile[]>([]);
  const [activeId, setActiveId] = useState<string>("");
  const [editingId, setEditingId] = useState<string>("");

  const [email, setEmail] = useState<EmailReq>({
    from: "",
    fromName: "",
    replyTo: "",
    to: [""],
    cc: [],
    bcc: [],
    subject: "",
    body: "",
    html: "",
    attachments: [],
  });

  const [testResults, setTestResults] = useState<Record<string, Result>>({});
  const [testLoadingId, setTestLoadingId] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<Record<string, boolean>>({});

  const [sendResult, setSendResult] = useState<Result | null>(null);
  const [sending, setSending] = useState(false);

  const [snippets, setSnippets] = useState<SnippetGroup[]>([]);
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [sentHistory, setSentHistory] = useState<SentEmail[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoHistory, setAutoHistory] = useState<Record<string, string[]>>({});

  // Slide-over Drawer & Modal
  const [drawerTab, setDrawerTab] = useState<"snippets" | "templates" | null>(
    null
  );
  const [inspectLog, setInspectLog] = useState<string | null>(null);

  // Load Data on Initial Launch
  useEffect(() => {
    LoadData().then((raw: string) => {
      let data = EMPTY_DATA;
      try {
        if (raw) data = { ...EMPTY_DATA, ...JSON.parse(raw) };
      } catch {
        data = EMPTY_DATA;
      }

      const profs =
        data.profiles && data.profiles.length > 0
          ? data.profiles
          : [
              newProfile({
                name: "Local Mailpit",
                server: "localhost",
                port: 1025,
                startTLS: false,
                skipVerify: true,
              }),
            ];

      setProfiles(profs);
      const aid =
        data.activeId && profs.find((p) => p.id === data.activeId)
          ? data.activeId
          : profs[0].id;

      setActiveId(aid);
      setEditingId(aid);
      setSnippets(
        data.snippets && data.snippets.length > 0
          ? data.snippets
          : DEFAULT_SNIPPETS
      );
      setTemplates(data.templates || []);
      setSentHistory(data.sentHistory || []);
      setAutoHistory(data.history || {});
      setTestStatus(data.testStatus || {});
      if (data.draft) {
        setEmail((prev) => ({ ...prev, ...data.draft }));
      }
      setDataLoaded(true);
    });
  }, []);

  // Debounced Persistent Save
  const saveAll = useCallback(() => {
    const data: AppData = {
      profiles,
      activeId,
      snippets,
      templates,
      sentHistory,
      draft: email,
      testStatus,
      history: autoHistory,
    };
    SaveData(JSON.stringify(data, null, 2));
  }, [
    profiles,
    activeId,
    snippets,
    templates,
    sentHistory,
    email,
    testStatus,
    autoHistory,
  ]);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dataLoaded) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveAll(), 500);
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, [dataLoaded, saveAll]);

  // Active Profile Lookup
  const activeProfile =
    profiles.find((p) => p.id === activeId) || profiles[0];

  // Helper: record to autocomplete history
  const recHistory = (field: string, val: string) => {
    const trimmed = t(val);
    if (!trimmed) return;
    setAutoHistory((prev) => {
      const list = prev[field] || [];
      if (list[0] === trimmed) return prev;
      return {
        ...prev,
        [field]: [trimmed, ...list.filter((x) => x !== trimmed)].slice(0, 25),
      };
    });
  };

  // Helper: append to activity log
  const pushLog = (
    action: "test" | "send",
    serverName: string,
    ok: boolean,
    msg: string,
    duration?: string,
    rawLog?: string
  ) => {
    const newEntry: LogEntry = {
      id: crypto.randomUUID(),
      time: new Date().toLocaleTimeString(),
      timestamp: Date.now(),
      server: serverName,
      action,
      ok,
      msg,
      duration,
      log: rawLog,
    };
    setLogs((prev) => [newEntry, ...prev].slice(0, 300));
  };

  // ── Profile Actions ──────────────────────────────────────────────────────────
  const handleUpdateProfile = (updated: ServerProfile) => {
    setProfiles((ps) => ps.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleAddProfile = () => {
    const p = newProfile({ name: `Relay #${profiles.length + 1}` });
    setProfiles((ps) => [...ps, p]);
    setEditingId(p.id);
    setView("servers");
  };

  const handleDeleteProfile = (id: string) => {
    if (profiles.length <= 1) return;
    const remaining = profiles.filter((p) => p.id !== id);
    setProfiles(remaining);
    if (activeId === id) setActiveId(remaining[0].id);
    if (editingId === id) setEditingId(remaining[0].id);
  };

  const handleSaveProfile = (p: ServerProfile) => {
    const clean = trimProfile(p);
    handleUpdateProfile(clean);
    recHistory("profile_name", clean.name);
    recHistory("smtp_server", clean.server);
    recHistory("smtp_port", String(clean.port));
    recHistory("smtp_username", clean.username);
  };

  const handleTestConnection = async (profile: ServerProfile) => {
    const clean = trimProfile(profile);
    handleUpdateProfile(clean);
    setTestLoadingId(clean.id);
    try {
      const res = (await TestConnection(toSMTPConfig(clean))) as Result;
      setTestResults((prev) => ({ ...prev, [clean.id]: res }));
      setTestStatus((prev) => ({ ...prev, [clean.id]: res.success }));

      pushLog(
        "test",
        clean.name,
        res.success,
        res.success
          ? `Handshake OK: ${clean.server}:${clean.port} (${res.duration})`
          : `Handshake Failed: ${res.message}`,
        res.duration,
        res.log
      );
    } catch (err) {
      const errRes: Result = { success: false, message: `Error: ${err}` };
      setTestResults((prev) => ({ ...prev, [clean.id]: errRes }));
      setTestStatus((prev) => ({ ...prev, [clean.id]: false }));
      pushLog("test", clean.name, false, `Handshake Error: ${err}`);
    }
    setTestLoadingId(null);
  };

  // ── Email Dispatch Actions ───────────────────────────────────────────────────
  const handleSendEmail = async () => {
    if (!activeProfile) return;
    setSending(true);
    setSendResult(null);

    const cp = trimProfile(activeProfile);
    const toList = email.to.map(t).filter(Boolean);
    const fromAddr = t(email.from);
    const fromName = t(email.fromName);
    const fromHeader = fromName ? `${fromName} <${fromAddr}>` : fromAddr;

    try {
      const res = (await SendEmail({
        config: toSMTPConfig(cp),
        from: fromHeader,
        replyTo: t(email.replyTo),
        to: toList,
        cc: email.cc.map(t).filter(Boolean),
        bcc: email.bcc.map(t).filter(Boolean),
        subject: t(email.subject),
        body: email.body,
        html: email.html,
        attachments: email.attachments.map(t).filter(Boolean),
      })) as Result;

      setSendResult(res);

      if (res.success) {
        recHistory("email_from", fromAddr);
        if (fromName) recHistory("email_from_name", fromName);
        toList.forEach((v) => recHistory("email_to", v));
        if (t(email.subject)) recHistory("email_subject", t(email.subject));

        // Append to Sent History
        const sentRecord: SentEmail = {
          id: crypto.randomUUID(),
          sentAt: Date.now(),
          server: cp.name,
          email: { ...email },
          result: res,
        };
        setSentHistory((prev) => [sentRecord, ...prev].slice(0, 300));
      }

      pushLog(
        "send",
        cp.name,
        res.success,
        res.success
          ? `Dispatched → Queue: ${res.queueId || "OK"} (${res.duration})`
          : `Send Failed: ${res.message}`,
        res.duration,
        res.log
      );
    } catch (err) {
      const errRes: Result = { success: false, message: `Send exception: ${err}` };
      setSendResult(errRes);
      pushLog("send", cp.name, false, `Send Error: ${err}`);
    }
    setSending(false);
  };

  const handlePickFiles = async () => {
    try {
      const files = (await PickFiles()) as string[];
      if (files && files.length > 0) {
        setEmail((prev) => ({
          ...prev,
          attachments: Array.from(new Set([...(prev.attachments || []), ...files])),
        }));
      }
    } catch (err) {
      console.error("Failed to pick files:", err);
    }
  };

  const handleNewDraft = () => {
    setEmail({
      from: "",
      fromName: "",
      replyTo: "",
      to: [""],
      cc: [],
      bcc: [],
      subject: "",
      body: "",
      html: "",
      attachments: [],
    });
    setSendResult(null);
  };

  // ── Template Actions ────────────────────────────────────────────────────────
  const handleSaveTemplate = (name: string) => {
    const tmpl: EmailTemplate = {
      id: crypto.randomUUID(),
      name,
      createdAt: Date.now(),
      email: { ...email, attachments: email.attachments || [] },
    };
    setTemplates((prev) => [tmpl, ...prev]);
  };

  const handleLoadTemplate = (tmpl: EmailTemplate) => {
    setEmail({ ...tmpl.email, attachments: tmpl.email.attachments || [] });
    setView("compose");
    setDrawerTab(null);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => prev.filter((t) => t.id !== id));
  };

  // ── Snippets Actions ────────────────────────────────────────────────────────
  const handleAddSnippetGroup = () => {
    const newGroup: SnippetGroup = {
      id: crypto.randomUUID(),
      name: `Category #${snippets.length + 1}`,
      createdAt: Date.now(),
      items: [{ id: crypto.randomUUID(), value: "" }],
    };
    setSnippets((prev) => [...prev, newGroup]);
  };

  const handleUpdateSnippetGroup = (
    id: string,
    changes: Partial<SnippetGroup>
  ) => {
    setSnippets((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...changes } : g))
    );
  };

  const handleDeleteSnippetGroup = (id: string) => {
    setSnippets((prev) => prev.filter((g) => g.id !== id));
  };

  const handleInsertSnippetToCompose = (
    text: string,
    target: SnippetTarget = "to"
  ) => {
    const trimmed = text.trim();
    if (!trimmed) return;

    if (target === "to") {
      setEmail((prev) => {
        const cleanTo = prev.to.filter((t) => t.trim().length > 0);
        return {
          ...prev,
          to: [...cleanTo, trimmed],
        };
      });
    } else if (target === "cc") {
      setEmail((prev) => {
        const cleanCc = (prev.cc || []).filter((t) => t.trim().length > 0);
        return {
          ...prev,
          cc: [...cleanCc, trimmed],
        };
      });
    } else if (target === "bcc") {
      setEmail((prev) => {
        const cleanBcc = (prev.bcc || []).filter((t) => t.trim().length > 0);
        return {
          ...prev,
          bcc: [...cleanBcc, trimmed],
        };
      });
    } else if (target === "replyTo") {
      setEmail((prev) => ({
        ...prev,
        replyTo: trimmed,
      }));
    } else if (target === "subject") {
      setEmail((prev) => ({ ...prev, subject: trimmed }));
    } else if (target === "body") {
      const isHtml =
        trimmed.startsWith("<") &&
        (trimmed.endsWith(">") || trimmed.includes("</") || trimmed.includes("/>"));

      setEmail((prev) => {
        if (isHtml || prev.html) {
          return {
            ...prev,
            html: prev.html ? `${prev.html}\n\n${trimmed}` : trimmed,
          };
        } else {
          return {
            ...prev,
            body: prev.body ? `${prev.body}\n\n${trimmed}` : trimmed,
          };
        }
      });
    }
    setView("compose");
  };

  // ── History Actions ─────────────────────────────────────────────────────────
  const handleResendHistory = (item: SentEmail) => {
    setEmail({ ...item.email, attachments: item.email.attachments || [] });
    const matchingProfile = profiles.find((p) => p.name === item.server);
    if (matchingProfile) {
      setActiveId(matchingProfile.id);
    }
    setView("compose");
  };

  const handleClearHistory = () => {
    setSentHistory([]);
  };

  return (
    <div
      className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased select-none"
      style={{ ["--wails-draggable" as string]: "no-drag" }}
    >
      {/* ── Left Workspace Navigation ── */}
      <Sidebar
        currentView={view}
        onViewChange={(v) => setView(v)}
        activeServer={activeProfile}
        serverCount={profiles.length}
        templateCount={templates.length}
        snippetCount={snippets.reduce(
          (acc, g) => acc + g.items.filter((i) => i.value.trim()).length,
          0
        )}
        historyCount={sentHistory.length}
        logCount={logs.length}
        testStatus={testStatus}
      />

      {/* ── Center Stage & Content Area ── */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-background">
        {/* Global Header Bar */}
        <HeaderBar
          currentView={view}
          profiles={profiles}
          activeServer={activeProfile}
          onSelectServer={(id) => setActiveId(id)}
          onTestServer={handleTestConnection}
          testingServerId={testLoadingId}
          testStatus={testStatus}
          onToggleDrawer={(tab) =>
            setDrawerTab((prev) => (prev === tab ? null : tab))
          }
          isDrawerOpen={drawerTab !== null}
          drawerTab={drawerTab}
          onNewEmail={handleNewDraft}
          onAddServer={handleAddProfile}
        />

        {/* View Router */}
        <main className="flex-1 flex overflow-hidden min-h-0 relative">
          {view === "compose" && (
            <ComposeView
              email={email}
              onChange={setEmail}
              activeServer={activeProfile}
              profiles={profiles}
              onSelectServer={(id) => setActiveId(id)}
              onSend={handleSendEmail}
              sending={sending}
              sendResult={sendResult}
              onPickFiles={handlePickFiles}
              onSaveTemplate={handleSaveTemplate}
              historyMap={autoHistory}
              onInspectLog={(log) => setInspectLog(log)}
            />
          )}

          {view === "servers" && (
            <ServersView
              profiles={profiles}
              activeId={activeId}
              editingId={editingId}
              onSelectEditing={setEditingId}
              onSetActive={setActiveId}
              onUpdateProfile={handleUpdateProfile}
              onAddProfile={handleAddProfile}
              onDeleteProfile={handleDeleteProfile}
              onTestProfile={handleTestConnection}
              onSaveProfile={handleSaveProfile}
              testLoadingId={testLoadingId}
              testResults={testResults}
              testStatus={testStatus}
            />
          )}

          {view === "diagnostics" && (
            <DiagnosticsView
              logs={logs}
              onClearLogs={() => setLogs([])}
            />
          )}

          {view === "templates" && (
            <TemplatesView
              templates={templates}
              onLoadTemplate={handleLoadTemplate}
              onDeleteTemplate={handleDeleteTemplate}
            />
          )}

          {view === "snippets" && (
            <SnippetsView
              groups={snippets}
              onAddGroup={handleAddSnippetGroup}
              onUpdateGroup={handleUpdateSnippetGroup}
              onDeleteGroup={handleDeleteSnippetGroup}
              onInsertToCompose={handleInsertSnippetToCompose}
            />
          )}

          {view === "history" && (
            <HistoryView
              history={sentHistory}
              onResend={handleResendHistory}
              onClearHistory={handleClearHistory}
              onInspectLog={(log) => setInspectLog(log)}
            />
          )}

          {/* Quick Slide-Over Drawer (Snippets / Templates) */}
          <DrawerPanel
            isOpen={drawerTab !== null}
            tab={drawerTab}
            onClose={() => setDrawerTab(null)}
            snippets={snippets}
            templates={templates}
            onUseTemplate={handleLoadTemplate}
            onInsertSnippet={(text, target) =>
              handleInsertSnippetToCompose(text, target)
            }
          />
        </main>
      </div>

      {/* Global SMTP Protocol Inspector Modal */}
      <SmtpInspectorModal
        log={inspectLog}
        onClose={() => setInspectLog(null)}
      />
    </div>
  );
}
