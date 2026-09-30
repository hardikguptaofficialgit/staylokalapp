"use client";

import { ArrowDown, ArrowUp } from "@phosphor-icons/react";
import type { FileQueueItem } from "@/lib/app/accepted-file-queue";
import type { ReactNode } from "react";

export type { FileQueueItem };

type OrderedFileListProps = {
  items: FileQueueItem[];
  onMove: (fromQueueIndex: number, toQueueIndex: number) => void;
  ariaLabel?: string;
  hint?: string;
  variant?: "grid" | "compact";
  renderThumbnail?: (file: File) => ReactNode;
};

export default function OrderedFileList({
  items,
  onMove,
  ariaLabel = "File order",
  hint = "Output follows this order. Use the arrows to reorder.",
  variant = "compact",
  renderThumbnail,
}: OrderedFileListProps) {
  if (items.length < 2) return null;

  return (
    <section className={`ordered-file-list ordered-file-list-${variant}`} aria-label={ariaLabel}>
      <p className="ordered-file-list-hint">{hint}</p>
      <ol className="ordered-file-list-items">
        {items.map((item, position) => (
          <li className="ordered-file-list-item" key={`${item.queueIndex}-${item.file.name}-${item.file.size}-${item.file.lastModified}`}>
            <span className="ordered-file-list-index" aria-hidden="true">{position + 1}</span>
            {renderThumbnail && <div className="ordered-file-list-thumb">{renderThumbnail(item.file)}</div>}
            <span className="ordered-file-list-name" title={item.file.name}>{item.file.name}</span>
            <div className="ordered-file-list-actions">
              <button
                type="button"
                className="ordered-file-list-move"
                disabled={position === 0}
                aria-label={`Move ${item.file.name} earlier`}
                onClick={() => onMove(item.queueIndex, items[position - 1].queueIndex)}
              >
                <ArrowUp size={16} weight="bold" />
              </button>
              <button
                type="button"
                className="ordered-file-list-move"
                disabled={position === items.length - 1}
                aria-label={`Move ${item.file.name} later`}
                onClick={() => onMove(item.queueIndex, items[position + 1].queueIndex)}
              >
                <ArrowDown size={16} weight="bold" />
              </button>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
