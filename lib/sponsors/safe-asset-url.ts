/** HTTPS asset URLs safe for inline CSS `url("...")` and `<img src>`. */
export function isSafePublicHttpsUrl(value: string): boolean {
  if (!value || /["'<>()]/.test(value)) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && Boolean(url.hostname);
  } catch {
    return false;
  }
}
