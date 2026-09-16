export type MediaOptions = Record<string, string | number | boolean>;

export type MediaOutput = {
  pattern: string;
  extension: string;
  mime: string;
  multiple?: boolean;
};

function audioMimeForExtension(extension: string) {
  if (extension === "wav") return "audio/wav";
  if (extension === "m4a") return "audio/mp4";
  if (extension === "flac") return "audio/flac";
  if (extension === "aac") return "audio/aac";
  if (extension === "ogg" || extension === "oga") return "audio/ogg";
  return "audio/mpeg";
}

export function mediaOutput(operation: string, options: MediaOptions, input: string): MediaOutput {
  if (operation === "split") return { pattern: "ihatefiles-segment-%03d.mp4", extension: "mp4", mime: "video/mp4", multiple: true };
  if (operation === "to-gif") return { pattern: "ihatefiles-output.gif", extension: "gif", mime: "image/gif" };
  if (operation === "from-gif") return { pattern: "ihatefiles-output.mp4", extension: "mp4", mime: "video/mp4" };
  if (operation === "extract-audio") return { pattern: "ihatefiles-output.mp3", extension: "mp3", mime: "audio/mpeg" };
  if (operation === "convert-audio") {
    const extension = String(options.format || "mp3");
    return { pattern: `ihatefiles-output.${extension}`, extension, mime: audioMimeForExtension(extension) };
  }
  const inputExtension = (input.split(".").pop() || "mp4").toLowerCase();
  const audioInput = ["mp3", "wav", "m4a", "aac", "flac", "ogg", "oga"].includes(inputExtension);
  if (["audio-trim", "metadata-audio"].includes(operation) || (operation === "metadata" && audioInput)) {
    const extension = inputExtension;
    return { pattern: `ihatefiles-output.${extension}`, extension, mime: audioMimeForExtension(extension) };
  }
  if (operation === "normalize-audio") {
    return { pattern: `ihatefiles-output.${inputExtension}`, extension: inputExtension, mime: audioInput ? audioMimeForExtension(inputExtension) : "video/mp4" };
  }
  if (operation === "thumbnail") return { pattern: "ihatefiles-output.jpg", extension: "jpg", mime: "image/jpeg" };
  if (operation === "frames") return { pattern: "ihatefiles-frame-%03d.jpg", extension: "jpg", mime: "image/jpeg", multiple: true };
  const passthrough = ["trim", "mute", "remove-audio", "metadata"].includes(operation);
  const extension = operation === "convert" ? String(options.format || "mp4") : passthrough ? inputExtension : "mp4";
  return { pattern: `ihatefiles-output.${extension}`, extension, mime: extension === "webm" ? "video/webm" : "video/mp4" };
}

export function mediaArgs(operation: string, options: MediaOptions, input: string, output: MediaOutput) {
  const value = (key: string, fallback: string | number) => options[key] ?? fallback;
  switch (operation) {
    case "trim":
    case "audio-trim":
      return ["-ss", String(value("start", "00:00:00")), "-i", input, "-t", String(value("duration", "00:00:10")), "-c", "copy", output.pattern];
    case "cut": {
      const start = Number(value("startSeconds", 0));
      const duration = Number(value("durationSeconds", 10));
      if (!Number.isFinite(start) || start < 0 || !Number.isFinite(duration) || duration <= 0) {
        throw new Error("Cut start and duration must be valid positive numbers.");
      }
      const end = start + duration;
      return options.videoOnly
        ? ["-i", input, "-vf", `select='not(between(t,${start},${end}))',setpts=N/FRAME_RATE/TB`, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", output.pattern]
        : ["-i", input, "-vf", `select='not(between(t,${start},${end}))',setpts=N/FRAME_RATE/TB`, "-af", `aselect='not(between(t,${start},${end}))',asetpts=N/SR/TB`, "-map", "0:v", "-map", "0:a?", "-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", output.pattern];
    }
    case "split":
      return ["-i", input, "-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-c:a", "aac", "-f", "segment", "-segment_time", String(value("segmentDuration", 10)), "-segment_format", "mp4", "-reset_timestamps", "1", "ihatefiles-segment-%03d.mp4"];
    case "compress":
      return ["-i", input, "-c:v", "libx264", "-crf", String(value("quality", 28)), "-preset", "veryfast", "-c:a", "aac", output.pattern];
    case "convert":
      return output.extension === "webm"
        ? ["-i", input, "-c:v", "libvpx-vp9", "-c:a", "libopus", output.pattern]
        : ["-i", input, "-c:v", "libx264", "-c:a", "aac", output.pattern];
    case "resize":
      return ["-i", input, "-vf", `scale=${value("width", 1280)}:-2`, "-c:v", "libx264", "-c:a", "aac", output.pattern];
    case "fps":
      return ["-i", input, "-vf", `fps=${value("fps", 30)}`, "-c:v", "libx264", "-c:a", "aac", output.pattern];
    case "speed": {
      const speed = Number(value("speed", 1));
      if (!Number.isFinite(speed) || speed <= 0) throw new Error("Playback speed must be greater than zero.");
      const filters: string[] = [];
      let remaining = speed;
      while (remaining > 2) { filters.push("atempo=2"); remaining /= 2; }
      while (remaining < 0.5) { filters.push("atempo=0.5"); remaining /= 0.5; }
      filters.push(`atempo=${remaining}`);
      return options.videoOnly
        ? ["-i", input, "-vf", `setpts=${1 / speed}*PTS`, "-an", "-c:v", "libx264", "-pix_fmt", "yuv420p", output.pattern]
        : ["-i", input, "-filter_complex", `[0:v]setpts=${1 / speed}*PTS[v];[0:a]${filters.join(",")}[a]`, "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-c:a", "aac", output.pattern];
    }
    case "mute":
    case "remove-audio":
      return ["-i", input, "-c", "copy", "-an", output.pattern];
    case "extract-audio":
      return ["-i", input, "-vn", "-c:a", "libmp3lame", output.pattern];
    case "to-gif":
      return ["-i", input, "-vf", "fps=12,scale=640:-1:flags=lanczos", output.pattern];
    case "from-gif":
      return ["-i", input, "-movflags", "faststart", "-pix_fmt", "yuv420p", output.pattern];
    case "frames":
      return ["-i", input, "-vf", "fps=1", output.pattern];
    case "thumbnail":
      return ["-ss", "00:00:01", "-i", input, "-frames:v", "1", output.pattern];
    case "rotate":
      return ["-i", input, "-vf", `rotate=${(Number(value("angle", 90)) * Math.PI) / 180}:fillcolor=black`, "-c:v", "libx264", "-c:a", "aac", output.pattern];
    case "flip":
      return ["-i", input, "-vf", String(value("direction", "hflip")), "-c:v", "libx264", "-c:a", "aac", output.pattern];
    case "metadata":
    case "metadata-audio":
      return ["-i", input, "-map_metadata", "-1", "-c", "copy", output.pattern];
    case "normalize-audio":
      if (options.audioOnly) {
        const codec = output.extension === "wav"
          ? "pcm_s16le"
          : output.extension === "ogg" || output.extension === "oga"
            ? "libvorbis"
            : output.extension === "m4a"
              ? "aac"
              : output.extension === "flac"
                ? "flac"
                : output.extension === "aac"
                  ? "aac"
                  : "libmp3lame";
        return ["-i", input, "-vn", "-af", "loudnorm", "-c:a", codec, output.pattern];
      }
      return ["-i", input, "-af", "loudnorm", "-c:v", "copy", "-c:a", "aac", output.pattern];
    case "convert-audio":
      return ["-i", input, "-vn", "-c:a", String(options.format || "mp3") === "wav" ? "pcm_s16le" : "libmp3lame", output.pattern];
    case "subtitle":
      return ["-i", input, "-vf", `drawtext=text='${String(value("text", "StayLokal")).replaceAll("'", "\\'")}':x=(w-text_w)/2:y=h-80:fontsize=32:fontcolor=white:box=1:boxcolor=black@0.6`, output.pattern];
    default:
      throw new Error(`Unsupported media operation: ${operation}`);
  }
}
