import { useRef, useState } from "react";
import { UploadCloud } from "lucide-react";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadDropzone({ onFileSelected, disabled }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState(null);
  const inputRef = useRef(null);

  function validateAndEmit(file) {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setLocalError("Only .xlsx files are accepted.");
      return;
    }
    if (file.size > MAX_SIZE_BYTES) {
      setLocalError("File is too large — the limit is 10 MB.");
      return;
    }
    setLocalError(null);
    onFileSelected(file);
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          if (!disabled) validateAndEmit(e.dataTransfer.files?.[0]);
        }}
        onClick={() => !disabled && inputRef.current?.click()}
        className={`flex flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
          disabled ? "cursor-not-allowed border-surface-border bg-slate-50 opacity-60 dark:bg-white/5" : "cursor-pointer"
        } ${isDragOver ? "border-actual bg-blue-50 dark:bg-blue-500/10" : "border-surface-border bg-surface-card"}`}
      >
        <UploadCloud size={28} className={isDragOver ? "text-actual" : "text-ink-muted"} />
        <p className="mt-3 text-sm font-medium text-ink">Drag and drop your workbook here</p>
        <p className="mt-1 text-xs text-ink-muted">or click to choose a .xlsx file · up to 10 MB</p>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          disabled={disabled}
          onChange={(e) => validateAndEmit(e.target.files?.[0])}
        />
      </div>
      {localError && <p className="mt-2 text-sm font-medium text-negative">{localError}</p>}
    </div>
  );
}
