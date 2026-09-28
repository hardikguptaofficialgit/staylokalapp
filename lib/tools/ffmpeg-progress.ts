export function clampProgressRatio(ratio: number): number {
  if (!Number.isFinite(ratio)) return 0;
  return Math.min(1, Math.max(0, ratio));
}

export function mapEncodeProgress(encodeRatio: number, encodeStart = 0.14, encodeEnd = 0.96): number {
  const slice = clampProgressRatio(encodeRatio);
  return encodeStart + slice * (encodeEnd - encodeStart);
}

export function parseMediaDurationSeconds(logs: string): number | null {
  const match = /Duration:\s*(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(logs);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  const total = hours * 3600 + minutes * 60 + seconds;
  return total > 0 ? total : null;
}

export function parseMediaTimeSeconds(message: string): number | null {
  const match = /time=(\d+):(\d{2}):(\d{2}(?:\.\d+)?)/.exec(message);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  const seconds = Number(match[3]);
  if (![hours, minutes, seconds].every(Number.isFinite)) return null;
  return hours * 3600 + minutes * 60 + seconds;
}
