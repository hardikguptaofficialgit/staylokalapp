/**
 * Quick Cloudflare Tunnel to localhost:3000 for Dodo webhooks.
 * On first public URL, registers Dodo test webhook via setup-dodo-local-webhook.mjs.
 */
import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const target = process.env.TUNNEL_PORT ?? "3000";
const localUrl = `http://127.0.0.1:${target}`;
const urlPattern = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;

let registered = false;

function registerWebhook(publicBase) {
  if (registered) return;
  registered = true;
  console.log("\nRegistering Dodo test webhook for", publicBase);
  const setup = spawn(process.execPath, ["scripts/setup-dodo-local-webhook.mjs", publicBase], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  setup.on("exit", (code) => {
    if (code === 0) {
      console.log("\nRestart npm run dev:test if it was already running (loads new webhook secret).\n");
    }
  });
}

function handleChunk(chunk) {
  const text = chunk.toString();
  process.stdout.write(text);
  const match = text.match(urlPattern);
  if (match) {
    registerWebhook(match[0].replace(/\/$/, ""));
  }
}

const cloudflared =
  process.env.CLOUDFLARED_BIN?.trim() ||
  (process.platform === "win32"
    ? "C:\\Program Files (x86)\\cloudflared\\cloudflared.exe"
    : "cloudflared");

console.log(`Cloudflare quick tunnel → ${localUrl}`);
console.log("Leave this running while testing Dodo webhooks.\n");

const child = spawn(cloudflared, ["tunnel", "--url", localUrl], {
  cwd: root,
  stdio: ["inherit", "pipe", "pipe"],
  shell: false,
});

child.stdout.on("data", handleChunk);
child.stderr.on("data", handleChunk);

child.on("exit", (code) => {
  process.exit(code ?? 0);
});
