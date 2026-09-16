import {
  Archive, File, FileImage, FilePdf, FileText, FilmStrip,
  Folder, Presentation, Table, TextT, Waveform, type IconProps,
} from "@phosphor-icons/react";
import type { DetectedFileKind } from "@/lib/tools/file-types";

const icons: Record<DetectedFileKind, React.ComponentType<IconProps>> = {
  pdf: FilePdf,
  image: FileImage,
  document: FileText,
  presentation: Presentation,
  text: TextT,
  video: FilmStrip,
  spreadsheet: Table,
  audio: Waveform,
  archive: Archive,
  folder: Folder,
  unknown: File,
};

const colors: Record<DetectedFileKind, string> = {
  pdf: "#ef6b6b",
  image: "#d58af2",
  document: "#6da9ff",
  presentation: "#f2a65a",
  text: "#7ed6c0",
  video: "#b496ff",
  spreadsheet: "#68c58d",
  audio: "#72c8e8",
  archive: "#e5bf6a",
  folder: "#e5bf6a",
  unknown: "var(--muted)",
};

export default function FileTypeIcon({ kind, size = 20 }: { kind: DetectedFileKind; size?: number }) {
  const Icon = icons[kind] ?? File;
  return <Icon size={size} weight="duotone" style={{ color: colors[kind] }} aria-hidden="true" />;
}
