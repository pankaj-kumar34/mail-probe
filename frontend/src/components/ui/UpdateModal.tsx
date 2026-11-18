import React, { useCallback, useEffect, useState } from "react";
import {
  Download,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
  X,
  ArrowRight,
  RotateCcw,
  Package,
} from "lucide-react";
import { Events } from "@wailsio/runtime";
import type {
  AppVersionInfo,
  UpdateCheckResult,
} from "../../../bindings/mail-probe/models.js";
import { UpdaterService } from "../../../bindings/mail-probe/index.js";
import { Button } from "./button";
import { formatBytes, getErrorMessage } from "../../lib/utils";

interface UpdateProgress {
  stage: string;
  percent: number;
  downloadedBytes: number;
  totalBytes: number;
  message: string;
}

interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  versionInfo: AppVersionInfo | null;
  initialCheckResult: UpdateCheckResult | null;
  onUpdateCheckComplete?: (result: UpdateCheckResult) => void;
}

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  versionInfo,
  initialCheckResult,
  onUpdateCheckComplete,
}) => {
  const [checking, setChecking] = useState(false);
  const [localCheckResult, setLocalCheckResult] =
    useState<UpdateCheckResult | null>(null);
  const checkResult = localCheckResult ?? initialCheckResult;
  const [checkError, setCheckError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [restarting, setRestarting] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress | null>(null);
  const [installError, setInstallError] = useState<string | null>(null);

  const runCheck = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    setInstallError(null);
    setProgress(null);
    try {
      const res = await UpdaterService.CheckForUpdate();
      if (res) {
        setLocalCheckResult(res);
        if (onUpdateCheckComplete) {
          onUpdateCheckComplete(res);
        }
      }
    } catch (err: unknown) {
      setCheckError(getErrorMessage(err) || "Could not check GitHub Releases");
    } finally {
      setChecking(false);
    }
  }, [onUpdateCheckComplete]);

  useEffect(() => {
    if (!isOpen) return;

    const cancelProgress = Events.On("updater:progress", (ev: unknown) => {
      const raw = ev as { data?: UpdateProgress } | UpdateProgress | null;
      const data =
        raw && typeof raw === "object" && "data" in raw
          ? raw.data
          : (raw as UpdateProgress | null);
      if (data && data.stage) {
        setProgress(data);
        if (data.stage === "error") {
          setInstallError(data.message || "Update failed");
          setInstalling(false);
        } else if (data.stage === "ready") {
          setInstalling(false);
        }
      }
    });

    let checkTimer: ReturnType<typeof setTimeout> | undefined;
    if (!checkResult && !checking && !checkError) {
      checkTimer = setTimeout(() => {
        void runCheck();
      }, 0);
    }

    return () => {
      if (checkTimer !== undefined) clearTimeout(checkTimer);
      cancelProgress();
    };
  }, [isOpen, checkResult, checking, checkError, runCheck]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !installing && !restarting) {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, installing, restarting, onClose]);

  const handleInstallUpdate = async () => {
    if (!checkResult || !checkResult.assetUrl) return;
    setInstalling(true);
    setInstallError(null);
    setProgress({
      stage: "downloading",
      percent: 0,
      downloadedBytes: 0,
      totalBytes: checkResult.assetSize || 0,
      message: `Downloading ${checkResult.assetName || "update"}...`,
    });

    try {
      await UpdaterService.DownloadAndInstallUpdate(
        checkResult.assetUrl,
        checkResult.assetName,
        checkResult.checksumUrl || "",
      );
      setProgress({
        stage: "ready",
        percent: 100,
        downloadedBytes: checkResult.assetSize || 0,
        totalBytes: checkResult.assetSize || 0,
        message: "Update installed! Restart Mail Probe to apply.",
      });
    } catch (err: unknown) {
      setInstallError(getErrorMessage(err) || "Failed to install update");
    } finally {
      setInstalling(false);
    }
  };

  const handleRestartNow = async () => {
    setRestarting(true);
    try {
      await UpdaterService.RestartApp();
    } catch (err: unknown) {
      setRestarting(false);
      setInstallError(
        getErrorMessage(err) ||
          "Failed to restart automatically. Please quit and reopen Mail Probe.",
      );
    }
  };

  const handleOpenGitHub = async () => {
    const target =
      checkResult?.releaseUrl ||
      `https://github.com/${versionInfo?.repo || "pankaj-kumar34/mail-probe"}/releases`;
    try {
      await UpdaterService.OpenReleasePage(target);
    } catch {
      window.open(target, "_blank", "noopener,noreferrer");
    }
  };

  if (!isOpen) return null;

  const currentVer =
    checkResult?.currentVersion || versionInfo?.version || "1.0.0";
  const latestVer = checkResult?.latestVersion || currentVer;
  const hasUpdate = Boolean(checkResult?.hasUpdate);
  const canSelfUpdate = Boolean(
    checkResult?.canSelfUpdate && checkResult?.assetUrl,
  );
  const isReadyToRestart = progress?.stage === "ready";

  const publishedDate = checkResult?.publishedAt
    ? new Date(checkResult.publishedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/60 p-4 backdrop-blur-[2px]">
      <div
        className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="update-modal-title"
      >
        {/* Modal Header */}
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-200/80 bg-zinc-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex size-9 items-center justify-center rounded-xl border shadow-2xs ${
                hasUpdate
                  ? "border-emerald-200 bg-emerald-50 text-emerald-600"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
            >
              {hasUpdate ? (
                <Sparkles size={18} />
              ) : (
                <CheckCircle2 size={18} className="text-emerald-600" />
              )}
            </div>
            <div>
              <h2
                id="update-modal-title"
                className="text-sm font-bold tracking-tight text-zinc-900"
              >
                Software Update
              </h2>
              <p className="text-xs text-zinc-500">
                GitHub Releases • {versionInfo?.os || "desktop"}/
                {versionInfo?.arch || "arch"}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={installing || restarting}
            onClick={onClose}
            className="flex size-7 cursor-pointer items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-zinc-200/70 hover:text-zinc-700 disabled:opacity-40"
            aria-label="Close modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
          {/* Version Summary Card */}
          <div className="flex items-center justify-between rounded-xl border border-zinc-200/80 bg-zinc-50/60 p-4">
            <div className="flex items-center gap-3">
              <div className="space-y-0.5">
                <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  Installed
                </span>
                <div className="font-mono text-sm font-bold text-zinc-800">
                  v{currentVer}
                </div>
              </div>

              {hasUpdate && (
                <>
                  <ArrowRight size={14} className="text-zinc-400" />
                  <div className="space-y-0.5">
                    <span className="text-[11px] font-semibold tracking-wider text-emerald-600 uppercase">
                      Available
                    </span>
                    <div className="font-mono text-sm font-bold text-emerald-600">
                      v{latestVer}
                    </div>
                  </div>
                </>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={checking || installing || restarting}
              onClick={runCheck}
              className="h-8 cursor-pointer gap-1.5 border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
            >
              <RefreshCw
                size={13}
                className={checking ? "animate-spin" : ""}
              />
              <span>{checking ? "Checking..." : "Check Again"}</span>
            </Button>
          </div>

          {/* Check Error */}
          {checkError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0 text-rose-600"
              />
              <div className="space-y-1">
                <p className="font-semibold">Unable to check for updates</p>
                <p className="text-rose-600/90">{checkError}</p>
              </div>
            </div>
          )}

          {/* Up to Date */}
          {!checking && !checkError && checkResult && !hasUpdate && (
            <div className="flex items-center gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-4 text-xs text-emerald-800">
              <CheckCircle2
                size={18}
                className="shrink-0 text-emerald-600"
              />
              <div>
                <p className="font-semibold">
                  Mail Probe is up to date (v{currentVer})
                </p>
                <p className="mt-0.5 text-emerald-700/80">
                  You are running the latest version published on GitHub
                  Releases.
                </p>
              </div>
            </div>
          )}

          {/* Update Details & Release Notes */}
          {!checkError && hasUpdate && checkResult && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-600">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900">
                    {checkResult.releaseName || `v${latestVer}`}
                  </span>
                  {publishedDate && (
                    <span className="text-zinc-400">• {publishedDate}</span>
                  )}
                </div>

                {checkResult.checksumUrl && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <ShieldCheck size={11} />
                    SHA-256 Verified
                  </span>
                )}
              </div>

              {checkResult.assetName && (
                <div className="flex items-center justify-between rounded-lg border border-zinc-200/70 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
                  <span className="flex items-center gap-2 truncate font-mono text-[11px]">
                    <Package size={13} className="shrink-0 text-zinc-400" />
                    <span className="truncate">{checkResult.assetName}</span>
                  </span>
                  {checkResult.assetSize > 0 && (
                    <span className="shrink-0 font-mono text-[11px] text-zinc-400">
                      {formatBytes(checkResult.assetSize)}
                    </span>
                  )}
                </div>
              )}

              <div className="space-y-1.5">
                <span className="text-[11px] font-semibold tracking-wider text-zinc-400 uppercase">
                  Release Notes
                </span>
                <div className="max-h-44 overflow-y-auto rounded-xl border border-zinc-200 bg-zinc-50/50 p-3.5 text-xs leading-relaxed whitespace-pre-wrap text-zinc-700">
                  {checkResult.releaseNotes?.trim() ||
                    "No release notes provided for this release."}
                </div>
              </div>
            </div>
          )}

          {/* Download / Install Progress */}
          {(installing || progress) && (
            <div className="space-y-2 rounded-xl border border-zinc-200 bg-zinc-50 p-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-zinc-800">
                  {progress?.message || "Updating..."}
                </span>
                <span className="font-mono text-[11px] text-zinc-600">
                  {Math.round(progress?.percent || 0)}%
                </span>
              </div>

              <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-200">
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    progress?.stage === "error"
                      ? "bg-rose-600"
                      : "bg-emerald-600"
                  }`}
                  style={{
                    width: `${Math.min(100, Math.max(4, progress?.percent || 0))}%`,
                  }}
                />
              </div>

              {progress &&
                progress.stage === "downloading" &&
                progress.totalBytes > 0 && (
                  <div className="flex justify-end font-mono text-[10px] text-zinc-400">
                    {formatBytes(progress.downloadedBytes)} /{" "}
                    {formatBytes(progress.totalBytes)}
                  </div>
                )}
            </div>
          )}

          {/* Install Error State */}
          {installError && (
            <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
              <AlertTriangle
                size={15}
                className="mt-0.5 shrink-0 text-rose-600"
              />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">Automatic Installation Failed</p>
                <p className="mt-0.5 text-[11px] wrap-break-word break-all text-rose-600/90">
                  {installError}
                </p>
                <p className="mt-1.5 text-[11px] font-medium text-rose-700">
                  You can download the installer directly from the GitHub
                  Release page below.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex shrink-0 items-center justify-between gap-2.5 border-t border-zinc-200/80 bg-zinc-50 px-6 py-3.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleOpenGitHub}
            className="h-9 cursor-pointer gap-1.5 border-zinc-200 bg-white px-3.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
          >
            <ExternalLink size={13} />
            <span>GitHub Releases</span>
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={installing || restarting}
              onClick={onClose}
              className="h-9 cursor-pointer border-zinc-200 bg-white px-4 text-xs font-semibold text-zinc-700 hover:bg-zinc-100"
            >
              {isReadyToRestart ? "Later" : "Close"}
            </Button>

            {isReadyToRestart ? (
              <Button
                type="button"
                variant="default"
                size="sm"
                disabled={restarting}
                onClick={handleRestartNow}
                className="h-9 cursor-pointer gap-1.5 bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
              >
                <RotateCcw
                  size={13}
                  className={restarting ? "animate-spin" : ""}
                />
                <span>{restarting ? "Restarting..." : "Restart & Apply"}</span>
              </Button>
            ) : (
              hasUpdate &&
              (canSelfUpdate ? (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  disabled={installing}
                  onClick={handleInstallUpdate}
                  className="h-9 cursor-pointer gap-1.5 bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
                >
                  <Download size={13} />
                  <span>
                    {installing ? "Installing..." : `Update to v${latestVer}`}
                  </span>
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="default"
                  size="sm"
                  onClick={handleOpenGitHub}
                  className="h-9 cursor-pointer gap-1.5 bg-emerald-600 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-500"
                >
                  <ExternalLink size={13} />
                  <span>Download v{latestVer}</span>
                </Button>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
