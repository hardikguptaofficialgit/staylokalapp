import documentProcessor from "./document";
import ffmpegProcessor from "./ffmpeg";
import imageProcessor from "./image";
import pdfProcessor from "./pdf";
import type { ToolDescriptor, ToolProcessor } from "./types";

export const processors: Record<ToolDescriptor["kind"], ToolProcessor> = {
  image: imageProcessor,
  pdf: pdfProcessor,
  ffmpeg: ffmpegProcessor,
  document: documentProcessor,
};
