import Image from "next/image";
import { Moon, Sun } from "@phosphor-icons/react";
import type { AppWorkflow } from "./types";

export default function AppHeader({ workflow }: { workflow: AppWorkflow }) {
  return (
    <header className={`site-header ${workflow.files.length ? "site-header-workspace" : ""} mx-auto flex w-full max-w-[1500px] items-center justify-between px-6 py-5 lg:px-10`}>
        <div className="brand-pill">
          <Image src="/images/logo.png" alt="StayLokal" width={34} height={30} className="brand-logo" priority />
          <span>StayLokal</span>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted">
          <div className="view-toggle" role="group" aria-label="Choose tool view">
            <button
              type="button"
              className={`view-toggle-option ${workflow.viewMode === "smart" ? "view-toggle-option-active" : ""}`}
              aria-pressed={workflow.viewMode === "smart"}
              onClick={() => workflow.setViewMode("smart")}
            >
              Smart File
            </button>
            <button
              type="button"
              className={`view-toggle-option ${workflow.viewMode === "all" ? "view-toggle-option-active" : ""}`}
              aria-pressed={workflow.viewMode === "all"}
              onClick={() => workflow.setViewMode("all")}
            >
              All Tools
            </button>
          </div>
          <button className="sponsor-link" type="button" onClick={() => window.dispatchEvent(new Event("open-sponsor-modal"))}>Sponsor</button>
          <a className="donate-link" href="/donate">Donate</a>
          <button onClick={workflow.toggleTheme} className="control-pill theme-toggle" aria-label="Toggle color mode">
            <span className={workflow.themeChanging ? "theme-icon-spin" : ""}>
              {workflow.theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
            </span>
            <span className="hidden sm:inline font-medium">{workflow.theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
          </button>
        </div>
        <details className="mobile-header-menu">
          <summary aria-label="Open navigation menu">Menu</summary>
          <div className="mobile-header-menu-panel">
            <button type="button" onClick={() => workflow.setViewMode("all")}>All Tools</button>
            <button type="button" onClick={() => window.dispatchEvent(new Event("open-sponsor-modal"))}>Sponsor</button>
            <a href="/donate">Donate</a>
          </div>
        </details>
      </header>
  );
}
