import { getCloudflareContext } from "@opennextjs/cloudflare";

export const runtime = "nodejs";

const contentTypes: Record<string, string> = {
  "ffmpeg-core.js": "application/javascript",
  "ffmpeg-core.wasm": "application/wasm",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ file: string }> },
) {
  const { file } = await params;

  if (!contentTypes[file]) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const { env } = getCloudflareContext();
    const bucket = (env as unknown as {
      RUNTIME_ASSETS: { get: (key: string) => Promise<{
        body: ReadableStream;
        httpMetadata?: { contentType?: string };
      } | null> };
    }).RUNTIME_ASSETS;
    const object = await bucket.get(`ffmpeg/${file}`);

    if (object) {
      return new Response(object.body, {
        headers: {
          "Cache-Control": "public, max-age=31536000, immutable",
          "Content-Type": object.httpMetadata?.contentType ?? contentTypes[file],
        },
      });
    }
  } catch {
    // Local Next.js development does not have the deployed R2 binding.
  }

  const fallback = new URL(`/ffmpeg/${file}`, request.url);
  return fetch(fallback);
}
