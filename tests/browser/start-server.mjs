import { execFileSync, spawn } from "node:child_process";
import { resolve } from "node:path";

const nextBin = resolve("node_modules/next/dist/bin/next");
const port = process.env.PLAYWRIGHT_PORT ?? "3001";

execFileSync(process.execPath, [nextBin, "build"], { stdio: "inherit" });

const server = spawn(process.execPath, [nextBin, "start", "-p", port], {
  stdio: "inherit",
});

const stop = () => {
  if (!server.killed) server.kill();
};

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
server.once("exit", (code, signal) => {
  process.exit(code ?? (signal ? 1 : 0));
});
