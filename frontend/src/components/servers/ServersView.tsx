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
} from "lucide-react";
import { ServerProfile, Result } from "../../types";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import {
  SERVER_PRESETS,
  applyPreset,
  ServerPreset,
} from "../../lib/serverPresets";
import { parseSmtpLog } from "../../lib/smtpParser";
import { cn } from "../../lib/utils";

interface ServersViewProps {
  profiles: ServerProfile[];
  activeId: string;
  editingId: string;
  onSelectEditing: (id: string) => void;
  onSetActive: (id: string) => void;
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
  activeId,
  editingId,
  onSelectEditing,
  onSetActive,
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
  const editingProfile =
    profiles.find((p) => p.id === editingId) || profiles[0];

  const upd = (key: keyof ServerProfile, val: any) => {
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
  const parsedLog = result?.log ? parseSmtpLog(result.log) : [];

  return (
    <div className="flex-1 flex h-full overflow-hidden bg-zinc-50/50">
      {/* Left Column: Server Profiles Master List */}
      <div className="w-64 border-r border-border bg-white flex flex-col shrink-0">
        <div className="h-16 px-4 border-b border-border flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-2">
            <Server className="w-4 h-4 text-zinc-500" />
            <span className="text-xs font-bold text-zinc-800 uppercase tracking-wider">
              Relays
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">
              {profiles.length}
            </span>
          </div>
          <Button
            size="sm"
            onClick={onAddProfile}
            className="h-7 w-7 p-0 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md shadow-2xs flex items-center justify-center"
            title="Add Relay"
          >
            <Plus className="w-3.5 h-3.5" />
          </Button>
        </div>

        {/* Profiles List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {profiles.map((p) => {
            const isSelected = p.id === editingProfile?.id;
            const isActive = p.id === activeId;
            const ok = testStatus[p.id];
            const profileResult = testResults[p.id];

            return (
              <div
                key={p.id}
                onClick={() => onSelectEditing(p.id)}
                title={`${p.name} (${p.server || "localhost"}:${p.port})`}
                className={cn(
                  "px-3 py-2 rounded-lg text-sm cursor-pointer transition-all group relative border flex items-center justify-between gap-2",
                  isSelected
                    ? "bg-zinc-100/90 border-zinc-200/80 shadow-2xs"
                    : "bg-white border-transparent hover:bg-zinc-50 hover:border-zinc-200/60",
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className={cn(
                      "w-2 h-2 rounded-full shrink-0",
                      ok === true
                        ? "bg-emerald-500 shadow-xs shadow-emerald-500/40"
                        : ok === false
                          ? "bg-rose-500 shadow-xs shadow-rose-500/40"
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
                      "font-medium truncate text-sm",
                      isSelected
                        ? "text-zinc-900 font-semibold"
                        : "text-zinc-700",
                    )}
                  >
                    {p.name}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {profileResult?.duration && (
                    <span className="text-[11px] font-mono text-zinc-400">
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
                      className="opacity-0 group-hover:opacity-100 text-zinc-400 hover:text-rose-600 p-0.5 rounded transition-all"
                      title="Delete Profile"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
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
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
          {/* Aligned Right Header Bar (matches content alignment) */}
          <div className="h-16 px-6 border-b border-border bg-white shrink-0 flex items-center">
            <div className="max-w-5xl w-full flex items-center justify-between">
              <div className="flex items-center gap-3 min-w-0">
                <h2 className="text-base font-bold text-zinc-900 truncate">
                  {editingProfile.name}
                </h2>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSaveProfile(editingProfile)}
                  className="h-8 px-3.5 text-xs font-semibold bg-white text-zinc-700 hover:bg-zinc-50 border-border shadow-2xs"
                >
                  <Save className="w-3.5 h-3.5 mr-1.5" />
                  <span>Save</span>
                </Button>
                <Button
                  size="sm"
                  onClick={() => onTestProfile(editingProfile)}
                  disabled={isTesting || !editingProfile.server}
                  className="h-8 px-3.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-xs"
                >
                  {isTesting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                      <span>Testing…</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-3.5 h-3.5 mr-1.5 fill-current" />
                      <span>Test Connection</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Form Scroll Area */}
          <div className="flex-1 overflow-y-auto px-6 py-6">
            <div className="max-w-5xl w-full space-y-6">
              {/* Connection Parameters Card */}
              <div className="rounded-xl border border-border bg-white p-6 shadow-2xs space-y-5">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Connection Settings
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      Profile Name
                    </label>
                    <input
                      type="text"
                      value={editingProfile.name}
                      onChange={(e) => upd("name", e.target.value)}
                      placeholder="e.g. Work SMTP, Local Mailpit"
                      className="w-full h-10 px-3.5 rounded-lg border border-border text-sm font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 shadow-2xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      Relay Server Host
                    </label>
                    <input
                      type="text"
                      value={editingProfile.server}
                      onChange={(e) => upd("server", e.target.value)}
                      placeholder="smtp.example.com"
                      className="w-full h-10 px-3.5 rounded-lg border border-border text-sm font-mono font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 shadow-2xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      Port
                    </label>
                    <input
                      type="number"
                      value={editingProfile.port}
                      onChange={(e) =>
                        upd("port", parseInt(e.target.value) || 587)
                      }
                      placeholder="587"
                      className="w-full h-10 px-3.5 rounded-lg border border-border text-sm font-mono font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 shadow-2xs transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-1">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      SMTP Username
                    </label>
                    <input
                      type="text"
                      value={editingProfile.username}
                      onChange={(e) => upd("username", e.target.value)}
                      placeholder="user@example.com (or API Key)"
                      className="w-full h-10 px-3.5 rounded-lg border border-border text-sm font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 shadow-2xs transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      SMTP Password
                    </label>
                    <input
                      type="password"
                      value={editingProfile.password}
                      onChange={(e) => upd("password", e.target.value)}
                      placeholder="••••••••••••••••"
                      className="w-full h-10 px-3.5 rounded-lg border border-border text-sm font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 shadow-2xs transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Security & TLS Card */}
              <div className="rounded-xl border border-border bg-white p-6 shadow-2xs space-y-5">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider">
                  Security & Protocol
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      Authentication Scheme
                    </label>
                    <select
                      value={editingProfile.authType}
                      onChange={(e) => upd("authType", e.target.value)}
                      className="w-full h-10 px-3.5 rounded-lg border border-border text-sm font-medium text-zinc-900 bg-white outline-none focus:border-emerald-500 shadow-2xs transition-colors cursor-pointer"
                    >
                      <option value="plain">AUTH PLAIN (Standard)</option>
                      <option value="login">
                        AUTH LOGIN (Microsoft 365 / Legacy)
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-zinc-700 mb-2">
                      Transport Encryption Mode
                    </label>
                    <div className="flex items-center gap-3">
                      {editingProfile.port === 465 ? (
                        <span className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold">
                          <Lock className="w-4 h-4" />
                          Implicit TLS (Port 465)
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            upd("startTLS", !editingProfile.startTLS)
                          }
                          className={cn(
                            "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-xs font-bold transition-colors shadow-2xs",
                            editingProfile.startTLS
                              ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                              : "bg-zinc-50 border-border text-zinc-600 hover:bg-zinc-100",
                          )}
                        >
                          <Lock className="w-4 h-4" />
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
                          "inline-flex items-center gap-2 h-10 px-4 rounded-lg border text-xs font-bold transition-colors shadow-2xs",
                          editingProfile.skipVerify
                            ? "bg-amber-50 border-amber-300 text-amber-900"
                            : "bg-zinc-50 border-border text-zinc-600 hover:bg-zinc-100",
                        )}
                        title="Allow self-signed or invalid SSL certificates (useful for local test relays)"
                      >
                        <ShieldAlert className="w-4 h-4" />
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
                    "rounded-xl border p-5 shadow-xs space-y-4",
                    result.success
                      ? "bg-emerald-50/60 border-emerald-300"
                      : "bg-red-50/60 border-red-300",
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      {result.success ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      ) : (
                        <XCircle className="w-6 h-6 text-red-600 shrink-0" />
                      )}
                      <div>
                        <h4
                          className={cn(
                            "text-sm font-bold",
                            result.success
                              ? "text-emerald-950"
                              : "text-red-950",
                          )}
                        >
                          {result.success
                            ? "SMTP Handshake Succeeded"
                            : "Handshake Failed"}
                        </h4>
                        <p
                          className={cn(
                            "text-xs font-mono font-medium mt-1",
                            result.success
                              ? "text-emerald-800"
                              : "text-red-800",
                          )}
                        >
                          {result.message}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      {result.duration && (
                        <span className="font-mono font-bold text-zinc-800 bg-white px-2.5 py-1 rounded border border-border">
                          Latency: {result.duration}
                        </span>
                      )}
                      {result.log && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setShowLog((o) => !o)}
                          className="h-8 text-xs font-semibold bg-white text-zinc-800 border-border"
                        >
                          <Terminal className="w-3.5 h-3.5 mr-1.5" />
                          <span>
                            {showLog ? "Hide Log" : "View Protocol Log"}
                          </span>
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Protocol Log Viewer */}
                  {showLog && result.log && (
                    <div className="mt-3 rounded-xl border border-zinc-200 bg-zinc-950 p-4 font-mono text-xs leading-relaxed overflow-x-auto max-h-72 text-zinc-200">
                      {parsedLog.map((line, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "py-0.5",
                            line.direction === "client" &&
                              "text-cyan-400 font-semibold",
                            line.direction === "server" &&
                              (line.code?.startsWith("5")
                                ? "text-red-400 font-bold"
                                : line.code?.startsWith("2")
                                  ? "text-emerald-400"
                                  : "text-amber-300"),
                            line.direction === "error" &&
                              "text-red-400 font-bold",
                            line.direction === "system" && "text-zinc-400",
                          )}
                        >
                          {line.direction === "client" && "> "}
                          {line.direction === "server" && "< "}
                          {line.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-50/50">
          <div className="h-16 px-8 border-b border-border shrink-0 bg-white" />
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-zinc-400">
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mb-3 text-zinc-400">
              <Server className="w-7 h-7 stroke-[1.5]" />
            </div>
            <h3 className="text-base font-semibold text-zinc-800">
              No Server Relay Selected
            </h3>
            <p className="text-sm text-zinc-500 max-w-sm mt-1">
              Select a profile from the left list or create a new relay to
              configure credentials and test connections.
            </p>
            <Button
              size="sm"
              onClick={onAddProfile}
              className="mt-4 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white h-9 px-4"
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              <span>Add New Relay</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
