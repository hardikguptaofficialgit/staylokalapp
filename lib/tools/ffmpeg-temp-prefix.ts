/** Temporary filenames inside the FFmpeg worker virtual filesystem. */
export const FFMPEG_TEMP_PREFIX = "staylokal";

export function ffmpegTempName(suffix: string): string {
  return `${FFMPEG_TEMP_PREFIX}-${suffix}`;
}
