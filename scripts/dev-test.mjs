import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const testEnvPath = join(root, ".env.test.local");
const localEnvPath = join(root, ".env.local");

function parseEnvFile(path) {
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const index = line.indexOf("=");
    if (index === -1) continue;
    out[line.slice(0, index)] = line.slice(index + 1);
  }
  return out;
}

if (!existsSync(testEnvPath)) {
  console.error("Missing .env.test.local — copy .env.test.local.example and set DODO_PAYMENTS_API_KEY (test mode key from Dodo dashboard).");
  process.exit(1);
}

const merged = {
  ...(existsSync(localEnvPath) ? parseEnvFile(localEnvPath) : {}),
  ...parseEnvFile(testEnvPath),
};

if (process.env.DODO_PAYMENTS_API_KEY?.trim()) {
  merged.DODO_PAYMENTS_API_KEY = process.env.DODO_PAYMENTS_API_KEY.trim();
}
if (process.env.DODO_PAYMENTS_WEBHOOK_KEY?.trim()) {
  merged.DODO_PAYMENTS_WEBHOOK_KEY = process.env.DODO_PAYMENTS_WEBHOOK_KEY.trim();
}

if (!merged.DODO_PAYMENTS_API_KEY?.trim()) {
  console.error(
    "Set DODO_PAYMENTS_API_KEY in .env.test.local (Dodo dashboard, Live Mode OFF) or pass it in the shell for this command only.",
  );
  process.exit(1);
}

if (merged.DODO_PAYMENTS_ENVIRONMENT !== "test_mode") {
  console.error("DODO_PAYMENTS_ENVIRONMENT must be test_mode in .env.test.local.");
  process.exit(1);
}

const nextCli = join(root, "node_modules", "next", "dist", "bin", "next");
const child = spawn(process.execPath, [nextCli, "dev", "--webpack", "-p", "3000"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, ...merged },
});

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
