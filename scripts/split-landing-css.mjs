import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "app", "styles", "landing-pages.css");
const outDir = path.join(root, "app", "styles", "landing");

const modules = [
  { file: "hero-layout.css", start: 1, end: 177 },
  { file: "donate.css", start: 179, end: 431 },
  { file: "how-it-works.css", start: 432, end: 783 },
  { file: "sponsors-orbit.css", start: 785, end: 1260 },
  { file: "sponsors-overrides.css", start: 1262, end: 1322 },
  { file: "sponsors-ui.css", start: 1323, end: 2174 },
  { file: "chrome.css", start: 2176, end: 2509 },
];

if (!fs.existsSync(sourcePath)) {
  console.error("Missing app/styles/landing-pages.css");
  process.exit(1);
}

const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);
fs.mkdirSync(outDir, { recursive: true });

for (const { file, start, end } of modules) {
  const chunk = lines.slice(start - 1, end).join("\n").trimEnd();
  fs.writeFileSync(path.join(outDir, file), `${chunk}\n`, "utf8");
}

fs.unlinkSync(sourcePath);
console.log(`Split landing-pages.css into ${modules.length} files under app/styles/landing/`);
