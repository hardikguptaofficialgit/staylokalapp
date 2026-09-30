import Image from "next/image";
import PwaInstallButton from "./PwaInstallButton";
import ThemeToggle from "./ThemeToggle";
import type { AppWorkflow } from "./types";

export default function AppHeader({ workflow }: { workflow: AppWorkflow }) {
  return (
    <header className={`site-header site-header-bar ${workflow.files.length ? "site-header-workspace" : ""} mx-auto w-full max-w-[1500px] px-6 py-5 lg:px-10`}>
        <div className="site-header-brand-row">
          <div className="brand-pill">
            <Image src="/images/logo.png" alt="StayLokal" width={34} height={30} className="brand-logo" priority />
            <span>StayLokal</span>
          </div>
        </div>
        <div className="site-header-center">
          <PwaInstallButton />
        </div>
        <div className="site-header-actions flex items-center gap-4 text-sm text-muted">
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
          <ThemeToggle />
          <details className="mobile-header-menu">
            <summary aria-label="Open navigation menu">Menu</summary>
            <div className="mobile-header-menu-panel">
              <PwaInstallButton placement="menu" />
              <button type="button" onClick={() => workflow.setViewMode("all")}>All Tools</button>
              <button type="button" onClick={() => window.dispatchEvent(new Event("open-sponsor-modal"))}>Sponsor</button>
              <a href="/donate">Donate</a>
            </div>
          </details>
        </div>
      </header>
  );
}
