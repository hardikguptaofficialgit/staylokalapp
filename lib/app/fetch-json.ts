export async function readJsonResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get("content-type") ?? "";
  const raw = await response.text();
  if (!raw) {
    throw new Error(response.ok ? "Empty response from server." : `Request failed (${response.status}).`);
  }
  if (!contentType.includes("application/json") && raw.trimStart().startsWith("<")) {
    throw new Error(
      response.status === 404
        ? "API route not found. Restart dev with npm run dev (webpack) if this persists."
        : `Server returned HTML instead of JSON (${response.status}).`,
    );
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new Error(`Invalid JSON response (${response.status}).`);
  }
}
