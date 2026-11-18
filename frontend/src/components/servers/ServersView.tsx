import React, { useState } from "react";
import {
  Server,
  Zap,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  XCircle,
  Loader2,
  ShieldAlert,
  Lock,
  Terminal,
  Sparkles,
  Check,
} from "lucide-react";
import { ServerProfile, Result } from "../../types";
import { Button } from "../ui/button";
import {
  SERVER_PRESETS,
  applyPreset,
  ServerPreset,
} from "../../lib/serverPresets";
import { SmtpLogViewer } from "../common/SmtpLogViewer";
import { cn } from "../../lib/utils";
import {
  ViewShell,
  ViewContent,
  ViewEmptyState,
} from "../layout/PageContainer";

interface ServersViewProps {
  profiles: ServerProfile[];
  editingId: string;
  onSelectEditing: (id: string) => void;
  onUpdateProfile: (profile: ServerProfile) => void;
  onAddProfile: () => void;
  onDeleteProfile: (id: string) => void;
  onTestProfile: (profile: ServerProfile) => void;
  onSaveProfile: (profile: ServerProfile) => void;
  testLoadingId: string | null;
  testResults: Record<string, Result>;
  testStatus: Record<string, boolean>;
}

export const ServersView: React.FC<ServersViewProps> = ({
  profiles,
  editingId,
  onSelectEditing,
  onUpdateProfile,
  onAddProfile,
  onDeleteProfile,
  onTestProfile,
  onSaveProfile,
  testLoadingId,
  testResults,
  testStatus,
}) => {
  const [showLog, setShowLog] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);
  const editingProfile =
    profiles.find((p) => p.id === editingId) || profiles[0];

  const handleSave = () => {
    if (!editingProfile) return;
    onSaveProfile(editingProfile);
    setSavedNotice(true);
    setTimeout(() => setSavedNotice(false), 1500);
  };

  const upd = <K extends keyof ServerProfile>(key: K, val: ServerProfile[K]) => {
    if (!editingProfile) return;
    onUpdateProfile({ ...editingProfile, [key]: val });
  };

  const handleApplyPreset = (preset: ServerPreset) => {
    if (!editingProfile) return;
    const updated = applyPreset(editingProfile, preset);
    onUpdateProfile({ ...updated, name: `${preset.name}` });
  };

  const result = editingProfile ? testResults[editingProfile.id] : null;
  const isTesting = editingProfile && testLoadingId === editingProfile.id;

  return (
    <div className="flex h-full flex-1 overflow-hidden bg-background">
      {/* Left Column: Server Profiles Master List */}
      <div className="flex w-72 shrink-0 flex-col border-r border-border bg-card">
        {/* Profiles List */}
        <div className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          {profiles.map((p) => {
            const isSelected = p.id === editingProfile?.id;
            const ok = testStatus[p.id];
            const profileResult = testResults[p.id];

            return (
              <div
                key={p.id}
                onClick={() => onSelectEditing(p.id)}
                title={`${p.name} (${p.server || "localhost"}:${p.port})`}
                className={cn(
                  "group relative flex cursor-pointer items-center justify-between gap-2 rounded-lg border px-3 py-2 text-sm transition-all",
                  isSelected
                    ? "border-border bg-muted shadow-sm"
                    : "border-transparent bg-card hover:border-border/60 hover:bg-muted/50",
                )}
              >
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      ok === true
                        ? "bg-emerald-500 shadow-sm shadow-emerald-500/40"
                        : ok === false
                          ? "bg-red-500 shadow-sm shadow-red-500/40"
                          : "bg-zinc-300",
                    )}
                    title={
                      ok === true
                        ? "Connection verified"
                        : ok === false
                          ? "Connection failed"
                          : "Untested"
                    }
                  />
                  <span
                    className={cn(
                      "truncate text-[13px] font-medium",
                      isSelected
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground",
                    )}
                  >
                    {p.name}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1.5">
                  {profileResult?.duration && (
                    <span className="font-mono text-[11px] text-zinc-400">
                      {profileResult.duration}
                    </span>
                  )}
                  {profiles.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProfile(p.id);
                      }}
                      className="rounded p-0.5 text-zinc-400 opacity-0 transition-all group-hover:opacity-100 hover:text-red-600"
                      title="Delete Profile"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Server Editor */}
      {editingProfile ? (
        <ViewShell>
          {/* Form Scroll Area */}
          <ViewContent maxWidth="5xl" className="space-y-6">
            {/* Quick Presets */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-border bg-card px-5 py-3.5 shadow-sm">
              <div className="flex shrink-0 items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Sparkles className="size-3.5 text-emerald-600" />
                <span>Quick Presets:</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {SERVER_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    title={preset.description}
                    className="rounded-md border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground transition-colors hover:bg-muted"
                  >
                    {preset.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Parameters Card */}
            <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Connection Settings
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    Profile Name
                  </label>
                  <input
                    type="text"
                    value={editingProfile.name}
                    onChange={(e) => upd("name", e.target.value)}
                    placeholder="e.g. Work SMTP, Local Mailpit"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-sm transition-colors outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    Relay Server Host
                  </label>
                  <input
                    type="text"
                    value={editingProfile.server}
                    onChange={(e) => upd("server", e.target.value)}
                    placeholder="smtp.example.com"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 font-mono text-[13px] font-medium text-foreground shadow-sm transition-colors outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    Port
                  </label>
                  <input
                    type="number"
                    value={editingProfile.port}
                    onChange={(e) =>
                      upd("port", parseInt(e.target.value) || 587)
                    }
                    placeholder="587"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 font-mono text-[13px] font-medium text-foreground shadow-sm transition-colors outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 pt-1 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    SMTP Username
                  </label>
                  <input
                    type="text"
                    value={editingProfile.username}
                    onChange={(e) => upd("username", e.target.value)}
                    placeholder="user@example.com (or API Key)"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-sm transition-colors outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    SMTP Password
                  </label>
                  <input
                    type="password"
                    value={editingProfile.password}
                    onChange={(e) => upd("password", e.target.value)}
                    placeholder="••••••••••••••••"
                    className="h-9 w-full rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-sm transition-colors outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* Security & TLS Card */}
            <div className="space-y-5 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="text-xs font-bold tracking-wider text-zinc-400 uppercase">
                Security & Protocol
              </h3>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    Authentication Scheme
                  </label>
                  <select
                    value={editingProfile.authType}
                    onChange={(e) => upd("authType", e.target.value)}
                    className="h-9 w-full cursor-pointer rounded-lg border border-border bg-card px-3 text-[13px] font-medium text-foreground shadow-sm transition-colors outline-none focus:border-emerald-500"
                  >
                    <option value="plain">AUTH PLAIN (Standard)</option>
                    <option value="login">
                      AUTH LOGIN (Microsoft 365 / Legacy)
                    </option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-bold text-zinc-700">
                    Transport Encryption Mode
                  </label>
                  <div className="flex items-center gap-3">
                    {editingProfile.port === 465 ? (
                      <span className="inline-flex h-9 items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3.5 text-xs font-bold text-emerald-900">
                        <Lock className="size-3.5" />
                        Implicit TLS (Port 465)
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          upd("startTLS", !editingProfile.startTLS)
                        }
                        className={cn(
                          "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold shadow-sm transition-colors",
                          editingProfile.startTLS
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                        )}
                      >
                        <Lock className="size-3.5" />
                        {editingProfile.startTLS
                          ? "STARTTLS Enabled"
                          : "Plaintext (No STARTTLS)"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() =>
                        upd("skipVerify", !editingProfile.skipVerify)
                      }
                      className={cn(
                        "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-xs font-bold shadow-sm transition-colors",
                        editingProfile.skipVerify
                          ? "border-amber-300 bg-amber-50 text-amber-900"
                          : "border-border bg-muted/50 text-muted-foreground hover:bg-muted",
                      )}
                      title="Allow self-signed or invalid SSL certificates (useful for local test relays)"
                    >
                      <ShieldAlert className="size-4" />
                      <span>Skip TLS Verify</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Test Connection Diagnostic Card */}
            {result && (
              <div
                className={cn(
                  "space-y-4 rounded-xl border p-5 shadow-sm",
                  result.success
                    ? "border-emerald-300 bg-emerald-50/60"
                    : "border-red-300 bg-red-50/60",
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {result.success ? (
                      <CheckCircle2 className="size-6 shrink-0 text-emerald-600" />
                    ) : (
                      <XCircle className="size-6 shrink-0 text-red-600" />
                    )}
                    <div>
                      <h4
                        className={cn(
                          "text-sm font-bold",
                          result.success ? "text-emerald-950" : "text-red-950",
                        )}
                      >
                        {result.success
                          ? "SMTP Handshake Succeeded"
                          : "Handshake Failed"}
                      </h4>
                      <p
                        className={cn(
                          "mt-1 font-mono text-xs font-medium",
                          result.success ? "text-emerald-800" : "text-red-800",
                        )}
                      >
                        {result.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    {result.duration && (
                      <span className="rounded border border-border bg-white px-2.5 py-1 font-mono font-bold text-zinc-800">
                        Latency: {result.duration}
                      </span>
                    )}
                    {result.log && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setShowLog((o) => !o)}
                        className="h-8 border-border bg-white text-xs font-semibold text-zinc-800"
                      >
                        <Terminal className="mr-1.5 size-3.5" />
                        <span>
                          {showLog ? "Hide Log" : "View Protocol Log"}
                        </span>
                      </Button>
                    )}
                  </div>
                </div>

                {/* Protocol Log Viewer */}
                {showLog && result.log && (
                  <div className="mt-3 max-h-72 overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 p-4">
                    <SmtpLogViewer log={result.log} showLineNumbers={false} />
                  </div>
                )}
              </div>
            )}
          </ViewContent>

          {/* Docked Action Footer */}
          <footer className="z-10 flex h-14 shrink-0 items-center justify-end border-t border-border bg-card px-6">
            <div className="flex shrink-0 items-center gap-3">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleSave}
                className="h-9 border-border bg-card px-3.5 text-xs font-semibold text-foreground shadow-sm hover:bg-muted/50"
              >
                {savedNotice ? (
                  <>
                    <Check className="mr-1.5 size-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Saved</span>
                  </>
                ) : (
                  <>
                    <Save className="mr-1.5 size-3.5 text-muted-foreground" />
                    <span>Save</span>
                  </>
                )}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() => onTestProfile(editingProfile)}
                disabled={isTesting || !editingProfile.server}
                className="h-9 bg-emerald-600 px-4 text-[13px] font-bold text-white shadow-sm hover:bg-emerald-700"
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-1.5 size-4 animate-spin" />
                    <span>Testing…</span>
                  </>
                ) : (
                  <>
                    <Zap className="mr-1.5 size-4 fill-current" />
                    <span>Test Connection</span>
                  </>
                )}
              </Button>
            </div>
          </footer>
        </ViewShell>
      ) : (
        <ViewShell>
          <ViewEmptyState
            icon={Server}
            title="No Server Relay Selected"
            description="Select a profile from the left list or create a new relay to configure credentials and test connections."
            action={
              <Button
                size="sm"
                onClick={onAddProfile}
                className="h-9 bg-emerald-600 px-4 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Plus className="mr-1.5 size-3.5" />
                <span>Add New Relay</span>
              </Button>
            }
          />
        </ViewShell>
      )}
    </div>
  );
};
