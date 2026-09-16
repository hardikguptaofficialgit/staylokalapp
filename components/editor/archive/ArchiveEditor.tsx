"use client";

import { useEffect, useState } from "react";
import { readArchive, type ArchiveEntry } from "@/lib/tools/archive";

type ArchiveEditorProps = {
  file: File;
  options: Record<string, string | number | boolean>;
  onOptionsChange: (options: Record<string, string | number | boolean>) => void;
};

export default function ArchiveEditor({ file, options, onOptionsChange }: ArchiveEditorProps) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loadedFile, setLoadedFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void readArchive(file, controller.signal).then((archive) => {
      if (!controller.signal.aborted) {
        setEntries(archive.entries);
        setLoadedFile(file);
      }
    }).catch((cause: unknown) => {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "This ZIP could not be previewed.");
    });
    return () => controller.abort();
  }, [file]);

  const activeEntries = loadedFile === file ? entries : [];
  const selectedName = String(options.entry || activeEntries.find((entry) => !entry.directory)?.name || "");

  return (
    <section aria-label="Archive editor" className="mb-8 space-y-4">
      <div className="rounded-xl border border-line bg-background p-4">
        <p className="eyebrow !text-[10px] text-muted">Local ZIP contents</p>
        {error ? (
          <p className="mt-4 text-sm text-red-500" role="alert">{error}</p>
        ) : activeEntries.length ? (
          <div className="mt-4 max-h-[min(55vh,32rem)] space-y-1 overflow-auto">
            {activeEntries.map((entry) => (
              <button
                key={entry.originalName}
                type="button"
                disabled={entry.directory}
                aria-pressed={!entry.directory && entry.name === selectedName}
                onClick={() => onOptionsChange({ ...options, entry: entry.name })}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-line px-3 py-2 text-left text-sm transition-colors hover:border-foreground disabled:cursor-default disabled:opacity-60"
              >
                <span className="truncate">{entry.directory ? `Folder · ${entry.name}` : entry.name}</span>
                <span className="shrink-0 text-xs text-muted">{entry.directory ? "" : `${entry.size} bytes`}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-sm text-muted">Reading archive locally…</p>
        )}
      </div>
    </section>
  );
}
