"use client";

import AppHeader from "@/components/app/AppHeader";
import LandingState from "@/components/app/LandingState";
import SelectedToolPanel from "@/components/app/SelectedToolPanel";
import ToolBrowser from "@/components/app/ToolBrowser";
import WorkspaceSidebar from "@/components/app/WorkspaceSidebar";
import SponsorRail from "@/components/app/SponsorRail";
import SponsorPaymentStatus from "@/components/app/SponsorPaymentStatus";
import { useFileWorkflow } from "@/lib/app/useFileWorkflow";

export default function Home() {
  const { inputRef, ...workflow } = useFileWorkflow();
  const hasFiles = workflow.files.length > 0;
  const showAllTools = workflow.viewMode === "all" && !hasFiles;
  const pdfSelected = workflow.selected?.kind === "pdf";

  return (
    <main className={`app-window flex flex-col min-h-screen ${workflow.themeChanging ? "theme-changing" : ""}`}>
      <input
        ref={inputRef}
        type="file"
        hidden
        multiple
        accept="*/*"
        aria-label="Choose files"
        onChange={(event) => {
          if (event.target.files) workflow.addFiles(event.target.files);
          event.currentTarget.removeAttribute("webkitdirectory");
          event.currentTarget.accept = "*/*";
        }}
      />
      <AppHeader workflow={workflow} />
      <SponsorPaymentStatus />
      <section
        className={`mx-auto w-full flex-grow px-6 lg:px-10 ${hasFiles ? "max-w-[1500px] pb-16 pt-6" : showAllTools ? "all-tools-section max-w-[1400px] pb-16 pt-2 sm:pt-4" : "landing-section max-w-[1400px] pb-4 pt-2 sm:pt-4"}`}
      >
        {!hasFiles && !showAllTools ? (
          <LandingState workflow={workflow} inputRef={inputRef} />
        ) : showAllTools ? (
          <div className="all-tools-view animate-fade-in">
            <SponsorRail />
            <ToolBrowser workflow={workflow} />
          </div>
        ) : (
          <div
            className={`uploaded-layout w-full h-full min-h-[600px] ${workflow.selected ? "tool-selected-layout" : ""} ${pdfSelected ? "pdf-selected-layout" : ""}`}
            style={!workflow.selected ? { gridTemplateColumns: `${workflow.panelSplit}fr 20px ${100 - workflow.panelSplit}fr` } : pdfSelected ? { gridTemplateColumns: "minmax(0, 1fr)" } : { gridTemplateColumns: "190px minmax(0, 1fr)" }}
          >
            {!pdfSelected && <WorkspaceSidebar workflow={workflow} inputRef={inputRef} />}
            {!pdfSelected && <div
              className="workspace-divider"
              role="separator"
              aria-label="Resize layout"
              aria-orientation="vertical"
              aria-valuemin={20}
              aria-valuemax={50}
              aria-valuenow={workflow.panelSplit}
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "ArrowLeft") workflow.setPanelSplit((value) => Math.max(20, value - 2));
                if (event.key === "ArrowRight") workflow.setPanelSplit((value) => Math.min(50, value + 2));
                if (event.key === "Home") workflow.setPanelSplit(20);
                if (event.key === "End") workflow.setPanelSplit(50);
              }}
              onPointerDown={workflow.startDividerDrag}
            >
              <div className="divider-handle" />
            </div>}
            <div className="workspace-tools pt-2 pb-10 animate-slide-up">
              {workflow.selected ? <SelectedToolPanel workflow={workflow} inputRef={inputRef} /> : <ToolBrowser workflow={workflow} />}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
