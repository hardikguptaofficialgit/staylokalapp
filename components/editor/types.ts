import type { ReactNode } from "react";

export type EditorTone = "neutral" | "danger" | "success";

export interface EditorAction {
  id: string;
  label: string;
  icon?: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  kind?: "default" | "primary" | "danger";
}

export interface EditorResult {
  id: string;
  name: string;
  href: string;
  sizeLabel?: string;
}
