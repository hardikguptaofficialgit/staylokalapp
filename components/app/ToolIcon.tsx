import {
  Archive, ArrowsClockwise, ArrowsLeftRight, ArrowsOut, Copy, File, FileArrowDown,
  FileImage, FilePdf, FilePlus, FilmStrip, HighlighterCircle, ImageSquare, List,
  ListNumbers, Microphone, MinusSquare, Plus, Prohibit, Scan, Scissors, ShieldCheck,
  SpeakerSimpleX, Square, Stack, TextAa, Textbox, Timer, type IconProps, Waveform,
} from "@phosphor-icons/react";

type PhosphorIcon = React.ComponentType<IconProps>;

const toolIcons: Record<string, PhosphorIcon> = {
    attachment: File, cut: Scissors, grid: List, components: Plus, archive: Archive,
  "view-reload": ArrowsClockwise, expand: ArrowsOut, tv: FilmStrip, timer: Timer,
  "mic-off": SpeakerSimpleX, mic: Microphone, photo: ImageSquare, photos: FileImage,
  "3d-rotate": ArrowsClockwise, rotate: ArrowsClockwise, "transfer-horizontal": ArrowsLeftRight,
  privacy: ShieldCheck, typography: TextAa, waveform: Waveform, image: FileImage, pdf: FilePdf,
  "file-arrow-down": FileArrowDown, "file-plus": FilePlus, "text-aa": TextAa,
  "list-numbers": ListNumbers, layers: Stack, prohibit: Prohibit,
  "highlighter-circle": HighlighterCircle, square: Square, "minus-square": MinusSquare,
  copy: Copy, textbox: Textbox, scan: Scan, scissors: Scissors,
};

const toolColors: Record<string, string> = {
  pdf: "#ef6b6b", image: "#d58af2", photo: "#d58af2", photos: "#d58af2",
  tv: "#b496ff", timer: "#b496ff", mic: "#72c8e8", waveform: "#72c8e8",
  "mic-off": "#72c8e8", archive: "#e5bf6a", grid: "#9a9a9a", cut: "#ef9a72",
  rotate: "#ef6b6b", "3d-rotate": "#ef6b6b", "text-aa": "#f0a36b",
  "list-numbers": "#e5bf6a", layers: "#b7a7f5", prohibit: "#ef6b6b",
  "highlighter-circle": "#f0cf58", square: "#7eb7ed", "minus-square": "#9a9a9a",
  copy: "#9a9a9a", textbox: "#e09aee", scan: "#b98ce8", scissors: "#ef9a72",
};

export function ToolIcon({ name, size = 20 }: { name: string; size?: number }) {
  const Icon = toolIcons[name] ?? File;
  return <Icon size={size} weight="duotone" style={{ color: toolColors[name] ?? "var(--muted)" }} aria-hidden="true" />;
}
