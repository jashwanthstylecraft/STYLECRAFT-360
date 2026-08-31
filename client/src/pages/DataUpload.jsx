import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Download, AlertTriangle, FileSpreadsheet } from "lucide-react";
import PageShell from "../components/layout/PageShell";
import UploadDropzone from "../components/data/UploadDropzone";
import ValidationReport from "../components/data/ValidationReport";
import DiffPreview from "../components/data/DiffPreview";
import VersionHistoryList from "../components/data/VersionHistoryList";
import SampleDataBadge from "../components/data/SampleDataBadge";
import ExportExcelDialog from "../components/data/ExportExcelDialog";
import { useDataStatus } from "../hooks/useDataStatus";
import { useDataVersions } from "../hooks/useDataVersions";
import { invalidateAllDataQueries } from "../hooks/dataQueryKeys";
import { uploadDataFile, applyDataUpload, restoreDataVersion, TEMPLATE_DOWNLOAD_URL } from "../services/api";
import { ENABLE_EXCEL_EXPORT } from "../config/features";

function PageHeader({ isSampleData }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <div>
        <h1 className="text-2xl font-bold text-heading">Data</h1>
        <p className="mt-1 text-sm text-ink-secondary">Upload the latest weekly workbook — every chart updates from it.</p>
      </div>
      <SampleDataBadge isSampleData={isSampleData} />
    </div>
  );
}

export default function DataUpload() {
  const queryClient = useQueryClient();
  const { data: status } = useDataStatus();
  const { data: versionsData } = useDataVersions();

  const [phase, setPhase] = useState("idle"); // idle | uploading | preview | applying
  const [uploadResult, setUploadResult] = useState(null);
  const [note, setNote] = useState("");
  const [ackWarnings, setAckWarnings] = useState(false);
  const [applyError, setApplyError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);
  const [isRestoring, setIsRestoring] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);

  function invalidateEverything() {
    invalidateAllDataQueries(queryClient);
  }

  async function handleFileSelected(file) {
    setPhase("uploading");
    setSuccessMessage(null);
    setApplyError(null);
    setAckWarnings(false);
    try {
      const result = await uploadDataFile(file);
      setUploadResult(result);
      setPhase("preview");
    } catch (err) {
      setUploadResult({ ok: false, errors: [{ message: err.message }], warnings: [], preview: [] });
      setPhase("preview");
    }
  }

  function handleCancel() {
    setUploadResult(null);
    setPhase("idle");
    setAckWarnings(false);
  }

  async function handleApply() {
    setPhase("applying");
    setApplyError(null);
    try {
      await applyDataUpload(uploadResult.uploadId, note);
      invalidateEverything();
      setSuccessMessage("Applied — every chart is now reading from this upload.");
      setUploadResult(null);
      setNote("");
      setPhase("idle");
    } catch (err) {
      setApplyError(err.message);
      setPhase("preview");
    }
  }

  async function handleRestore(file) {
    setIsRestoring(true);
    setApplyError(null);
    try {
      await restoreDataVersion(file);
      invalidateEverything();
      setSuccessMessage("Restored — every chart is now reading from that version.");
    } catch (err) {
      setApplyError(err.message);
    } finally {
      setIsRestoring(false);
    }
  }

  const hasErrors = uploadResult?.errors?.length > 0;
  const hasWarnings = uploadResult?.warnings?.length > 0;
  const canApply = uploadResult?.ok && (!hasWarnings || ackWarnings);

  return (
    <PageShell lastUpdated={null}>
      <PageHeader isSampleData={status?.isSampleData} />

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-surface-border bg-surface-card px-5 py-4 shadow-sm">
        <div className="text-sm text-ink-secondary">
          {status?.isSampleData ? (
            "Currently showing seed/sample data — no upload has been applied yet."
          ) : (
            <>
              Currently showing uploaded data{status?.active?.appliedAt && ` applied ${new Date(status.active.appliedAt).toLocaleDateString("en-US")}`}
              {status?.active?.note && <> · "{status.active.note}"</>}
            </>
          )}
        </div>
        <div className="flex items-center gap-2">
          {ENABLE_EXCEL_EXPORT && (
            <button
              onClick={() => setShowExportDialog(true)}
              className="flex flex-col items-start rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-left shadow-sm hover:bg-surface-hover"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-heading">
                <FileSpreadsheet size={15} />
                Download Excel
              </span>
              <span className="text-xs text-ink-muted">Exports all saved data + charts</span>
            </button>
          )}
          <a
            href={TEMPLATE_DOWNLOAD_URL}
            className="flex items-center gap-1.5 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm font-medium text-heading shadow-sm hover:bg-surface-hover"
          >
            <Download size={15} />
            Download template
          </a>
        </div>
      </div>

      {showExportDialog && <ExportExcelDialog onClose={() => setShowExportDialog(false)} />}

      {successMessage && (
        <div className="mb-6 rounded-2xl border border-green-200 bg-green-50 p-4 text-sm font-medium text-positive dark:border-green-500/30 dark:bg-green-500/10">{successMessage}</div>
      )}

      {phase === "idle" || phase === "uploading" ? (
        <div className="mb-8">
          <UploadDropzone onFileSelected={handleFileSelected} disabled={phase === "uploading"} />
        </div>
      ) : (
        <div className="mb-8 space-y-5">
          <ValidationReport errors={uploadResult.errors} warnings={uploadResult.warnings} />

          {uploadResult.preview?.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-heading">What would change</h2>
              <DiffPreview preview={uploadResult.preview} />
            </div>
          )}

          {uploadResult.ok && (
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. Week of Jul 31 actuals"
                className="w-full max-w-md rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm text-ink focus:border-actual focus:outline-none"
              />
            </div>
          )}

          {hasWarnings && uploadResult.ok && (
            <label className="flex items-start gap-2 text-sm text-ink-secondary">
              <input type="checkbox" checked={ackWarnings} onChange={(e) => setAckWarnings(e.target.checked)} className="mt-0.5" />
              I've reviewed the warnings above and want to apply this upload anyway.
            </label>
          )}

          {applyError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-400">
              <AlertTriangle size={16} />
              {applyError}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              disabled={!canApply || phase === "applying"}
              className="rounded-lg bg-actual px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-actual-strong disabled:cursor-not-allowed disabled:opacity-40"
            >
              {phase === "applying" ? "Applying…" : "Apply data"}
            </button>
            <button
              onClick={handleCancel}
              disabled={phase === "applying"}
              className="rounded-lg border border-surface-border px-4 py-2 text-sm font-medium text-ink-secondary hover:bg-surface-hover"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <h2 className="mb-3 text-sm font-semibold text-heading">Version history</h2>
      <VersionHistoryList versions={versionsData?.versions ?? []} onRestore={handleRestore} isRestoring={isRestoring} />
    </PageShell>
  );
}
