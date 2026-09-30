"use client";

import OrderedFileList from "@/components/editor/OrderedFileList";
import { acceptedFileQueueItems } from "@/lib/app/accepted-file-queue";
import type { ToolDescriptor } from "@/lib/tools/types";

type ArchiveCreateEditorProps = {
  files: File[];
  tool: ToolDescriptor;
  archiveName: string;
  onArchiveNameChange: (value: string) => void;
  onMoveFile: (fromIndex: number, toIndex: number) => void;
};

export default function ArchiveCreateEditor({
  files,
  tool,
  archiveName,
  onArchiveNameChange,
  onMoveFile,
}: ArchiveCreateEditorProps) {
  const included = acceptedFileQueueItems(files, tool.accept);
  return (
    <section aria-label="ZIP creation" className="mb-8 space-y-4">
      <div className="rounded-xl border border-line bg-background p-4">
        <p className="eyebrow !text-[10px] text-muted">Files to include</p>
        <p className="mt-2 text-sm text-foreground">
          {included.length} {included.length === 1 ? "file" : "files"} will be added to the ZIP using each file&apos;s original name.
        </p>
        <OrderedFileList
          items={included}
          onMove={onMoveFile}
          hint="ZIP entry order follows this list."
        />
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
