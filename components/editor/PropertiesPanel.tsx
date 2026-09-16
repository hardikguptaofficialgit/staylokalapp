"use client";

import type { ReactNode } from "react";
import type { EditorAction } from "./types";

export interface PropertiesPanelProps {
  title?: string;
  description?: string;
  children: ReactNode;
  actions?: EditorAction[];
  className?: string;
}

export function PropertiesPanel({
  title = "Properties",
  description,
  children,
  actions = [],
  className = "",
}: PropertiesPanelProps) {
  return (
    <section className={`editor-panel editor-properties-panel ${className}`.trim()}>
      <div className="editor-panel-heading">
        <div>
          <h3 className="editor-panel-title">{title}</h3>
          {description && <p className="editor-panel-description">{description}</p>}
        </div>
      </div>
      <div className="editor-properties-fields">{children}</div>
      {actions.length > 0 && (
        <div className="editor-panel-actions">
          {actions.map((action) => (
            <button
              key={action.id}
              type="button"
              className={`editor-action editor-action-${action.kind ?? "default"}`}
              onClick={action.onClick}
              disabled={action.disabled}
            >
              {action.icon}
              <span>{action.label}</span>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
