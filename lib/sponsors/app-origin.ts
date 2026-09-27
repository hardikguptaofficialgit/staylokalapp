export function appOriginFromRequest(request: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/+$/, "");
  if (configured) return configured;
  return new URL(request.url).origin;
}
