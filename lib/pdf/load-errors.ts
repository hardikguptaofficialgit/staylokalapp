export function describePdfLoadError(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  if (/password|encrypt/i.test(text)) {
    return "This PDF is password-protected. Remove the password in another app, then try again.";
  }
  return "This PDF could not be rendered locally. It may be corrupted or use features this editor cannot open.";
}
