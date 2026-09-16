"use client";

import { useEffect, useMemo, useState } from "react";
import { readSpreadsheet, type SpreadsheetWorkbook } from "@/lib/tools/spreadsheet";

type SpreadsheetEditorProps = {
  file: File;
  options: Record<string, string | number | boolean>;
  onOptionsChange: (options: Record<string, string | number | boolean>) => void;
};

export default function SpreadsheetEditor({ file, options, onOptionsChange }: SpreadsheetEditorProps) {
  const [workbook, setWorkbook] = useState<SpreadsheetWorkbook | null>(null);
  const [error, setError] = useState("");
  const [loadedFile, setLoadedFile] = useState<File | null>(null);
  const [errorFile, setErrorFile] = useState<File | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    void readSpreadsheet(file, controller.signal).then((value) => {
      if (!controller.signal.aborted) {
        setWorkbook(value);
        setLoadedFile(file);
      }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) {
        setError(cause instanceof Error ? cause.message : "This spreadsheet could not be previewed.");
        setErrorFile(file);
      }
    });
    return () => controller.abort();
  }, [file]);

  const activeWorkbook = loadedFile === file ? workbook : null;
  const selectedName = String(options.sheet || activeWorkbook?.sheets[0]?.name || "");
  const selectedSheet = useMemo(
    () => activeWorkbook?.sheets.find((sheet) => sheet.name === selectedName) ?? activeWorkbook?.sheets[0],
    [selectedName, activeWorkbook],
  );
  const rows = selectedSheet?.rows.slice(0, 100) ?? [];
  const columnCount = Math.max(0, ...rows.map((row) => row.length));

  return (
    <section aria-label="Spreadsheet editor" className="mb-8 space-y-4">
      <div className="rounded-xl border border-line bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="eyebrow !text-[10px] text-muted">Local spreadsheet preview</p>
            {selectedSheet && <p className="mt-1 text-xs text-muted">{selectedSheet.rows.length} rows · {columnCount} columns</p>}
          </div>
          {activeWorkbook && activeWorkbook.sheets.length > 1 && (
            <label className="text-sm font-medium">
              Sheet
              <select
                className="field ml-2 w-auto min-w-40"
                value={selectedSheet?.name ?? ""}
                onChange={(event) => onOptionsChange({ ...options, sheet: event.target.value })}
              >
                {activeWorkbook.sheets.map((sheet) => <option key={sheet.name} value={sheet.name}>{sheet.name}</option>)}
              </select>
            </label>
          )}
        </div>
        {errorFile === file && error ? (
          <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>
        ) : selectedSheet ? (
          <div className="mt-4 max-h-[min(55vh,32rem)] overflow-auto rounded-lg border border-line">
            <table className="min-w-full border-collapse text-left text-xs">
              <tbody>
                {rows.map((row, rowIndex) => (
                  <tr key={rowIndex} className="border-b border-line last:border-b-0">
                    {Array.from({ length: columnCount }, (_, columnIndex) => (
                      <td key={columnIndex} className="whitespace-nowrap border-r border-line px-3 py-2 last:border-r-0">
                        {row[columnIndex] ?? ""}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Reading workbook locally…</p>
        )}
        {rows.length < (selectedSheet?.rows.length ?? 0) && (
          <p className="mt-2 text-xs text-muted">Showing the first 100 rows. CSV export includes the complete sheet.</p>
        )}
      </div>
    </section>
  );
}
