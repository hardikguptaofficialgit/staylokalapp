"use client";

import type { ReactNode } from "react";
import type { EditorAction } from "./types";

export interface ToolbarItem {
  id: string;
  label: string;
  icon?: ReactNode;
  active?: boolean;
  disabled?: boolean;
  onSelect: () => void;
}

export interface ToolbarProps {
  items: ToolbarItem[];
  actions?: EditorAction[];
  label?: string;
}

export function Toolbar({ items, actions = [], label = "Editor tools" }: ToolbarProps) {
  return (
    <nav className="editor-toolbar" aria-label={label}>
      <div className="editor-toolbar-items">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={`editor-toolbar-item ${item.active ? "is-active" : ""}`.trim()}
            onClick={item.onSelect}
            disabled={item.disabled}
            aria-pressed={item.active}
            title={item.label}
          >
            {item.icon}
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      {actions.length > 0 && (
        <div className="editor-toolbar-actions">
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
    </nav>
  );
}
