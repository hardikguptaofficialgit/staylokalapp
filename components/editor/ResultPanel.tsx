"use client";

import { CheckCircle, DownloadSimple } from "@phosphor-icons/react";
import type { EditorResult } from "./types";

export interface ResultPanelProps {
  results: EditorResult[];
  title?: string;
  emptyLabel?: string;
}

export function ResultPanel({
  results,
  title = "Ready to download",
  emptyLabel = "No results yet",
}: ResultPanelProps) {
  return (
    <section className="editor-panel editor-result-panel">
      <div className="editor-panel-heading">
        <div>
          <h3 className="editor-panel-title">{title}</h3>
          <p className="editor-panel-description">
            {results.length > 0 ? `${results.length} local result${results.length === 1 ? "" : "s"}` : emptyLabel}
          </p>
        </div>
        {results.length > 0 && <CheckCircle size={20} aria-hidden="true" />}
      </div>
      {results.length > 0 && (
        <div className="editor-result-list">
          {results.map((result) => (
            <a key={result.id} href={result.href} download={result.name} className="editor-result-link">
              <span className="editor-result-name">
                <span>{result.name}</span>
                {result.sizeLabel && <small>{result.sizeLabel}</small>}
              </span>
              <DownloadSimple size={18} aria-hidden="true" />
            </a>
          ))}
        </div>
      )}
    </section>
  );
}
