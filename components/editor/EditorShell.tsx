"use client";

import type { ReactNode } from "react";

export interface EditorShellProps {
  title: string;
  subtitle?: string;
  toolbar?: ReactNode;
  preview: ReactNode;
  properties?: ReactNode;
  processing?: ReactNode;
  result?: ReactNode;
  className?: string;
}

export function EditorShell({
  title,
  subtitle,
  toolbar,
  preview,
  properties,
  processing,
  result,
  className = "",
}: EditorShellProps) {
  return (
    <section className={`editor-shell ${className}`.trim()} aria-label={title}>
      <header className="editor-shell-header">
        <div>
          <p className="eyebrow">Editor</p>
          <h2 className="editor-shell-title">{title}</h2>
          {subtitle && <p className="editor-shell-subtitle">{subtitle}</p>}
        </div>
        {toolbar && <div className="editor-shell-toolbar">{toolbar}</div>}
      </header>

      <div className="editor-shell-body">
        <div className="editor-shell-preview">{preview}</div>
        {(properties || processing || result) && (
          <aside className="editor-shell-inspector">
            {properties}
            {processing}
            {result}
          </aside>
        )}
      </div>
    </section>
  );
}
