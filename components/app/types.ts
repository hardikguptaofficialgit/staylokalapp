import type { FileWorkflow } from "@/lib/app/useFileWorkflow";

export type AppWorkflow = Omit<FileWorkflow, "inputRef">;
