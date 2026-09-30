"use client";

import { Info, Warning } from "@phosphor-icons/react";
import { getToolQueueGuidance } from "@/lib/app/tool-queue-guidance";
import type { ToolDescriptor } from "@/lib/tools/types";

type ToolQueueGuidanceProps = {
  tool: ToolDescriptor;
  compatibleCount: number;
};

export default function ToolQueueGuidance({ tool, compatibleCount }: ToolQueueGuidanceProps) {
  const guidance = getToolQueueGuidance(tool, compatibleCount);
  if (!guidance) return null;

  const Icon = guidance.tone === "warning" ? Warning : Info;
  return (
    <div className={`tool-queue-guidance tool-queue-guidance-${guidance.tone}`} role="status">
      <Icon size={18} weight="fill" aria-hidden="true" />
      <p>{guidance.message}</p>
    </div>
  );
}
