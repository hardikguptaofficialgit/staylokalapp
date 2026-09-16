import { unlink } from "node:fs/promises";

try {
  await unlink(".open-next/assets/ffmpeg/ffmpeg-core.wasm");
  console.log("Moved FFmpeg WASM out of Workers Assets; serve it from R2.");
} catch (error) {
  if (error.code !== "ENOENT") throw error;
}
