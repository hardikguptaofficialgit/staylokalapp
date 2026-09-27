"use client";

import { matchesAcceptedFile } from "@/lib/tools/validation";
import type { ToolDescriptor } from "@/lib/tools/types";

type ArchiveCreateEditorProps = {
  files: File[];
  tool: ToolDescriptor;
  archiveName: string;
  onArchiveNameChange: (value: string) => void;
};

export default function ArchiveCreateEditor({ files, tool, archiveName, onArchiveNameChange }: ArchiveCreateEditorProps) {
  const included = files.filter((file) => matchesAcceptedFile(file, tool.accept));
  return (
    <section aria-label="ZIP creation" className="mb-8 space-y-4">
      <div className="rounded-xl border border-line bg-background p-4">
        <p className="eyebrow !text-[10px] text-muted">Files to include</p>
        <p className="mt-2 text-sm text-foreground">
          {included.length} {included.length === 1 ? "file" : "files"} will be added to the ZIP using each file&apos;s original name.
        </p>
        {included.length > 0 && (
          <ul className="mt-3 max-h-48 space-y-1 overflow-auto text-sm text-muted">
            {included.map((file) => <li key={`${file.name}-${file.size}`} className="truncate">{file.name}</li>)}
          </ul>
        )}
        {included.length === 0 && (
          <p className="mt-3 text-sm text-red-500" role="alert">Add at least one compatible file to the workspace first.</p>
        )}
      </div>
      <label className="block text-sm font-medium text-foreground">
        ZIP file name
        <input
          className="field mt-2"
          value={archiveName}
          onChange={(event) => onArchiveNameChange(event.target.value)}
          placeholder="archive.zip"
        />
      </label>
    </section>
  );
}
