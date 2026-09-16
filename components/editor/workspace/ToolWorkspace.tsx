import type { HTMLAttributes, ReactNode } from "react";

type SlotProps = HTMLAttributes<HTMLElement> & {
  children?: ReactNode;
};

export interface ToolWorkspaceProps extends HTMLAttributes<HTMLElement> {
  children: ReactNode;
}

export function ToolWorkspace({ children, className = "", ...props }: ToolWorkspaceProps) {
  return (
    <section className={`tool-workspace ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function ToolHeader({ children, className = "", ...props }: SlotProps) {
  return (
    <header className={`tool-workspace-header ${className}`.trim()} {...props}>
      {children}
    </header>
  );
}

export function ToolSidebar({ children, className = "", ...props }: SlotProps) {
  return (
    <aside className={`tool-workspace-sidebar ${className}`.trim()} {...props}>
      {children}
    </aside>
  );
}

export function ToolMain({ children, className = "", ...props }: SlotProps) {
  return (
    <div className={`tool-workspace-main ${className}`.trim()} {...props}>
      {children}
    </div>
  );
}

export function ToolControls({ children, className = "", ...props }: SlotProps) {
  return (
    <section className={`tool-workspace-controls ${className}`.trim()} {...props}>
      {children}
    </section>
  );
}

export function ToolActionBar({ children, className = "", ...props }: SlotProps) {
  return (
    <footer className={`tool-workspace-action-bar ${className}`.trim()} {...props}>
      {children}
    </footer>
  );
}
