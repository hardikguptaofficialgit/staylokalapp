import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const sourcePath = path.join(root, "app", "globals.monolith.css");
const stylesDir = path.join(root, "app", "styles");

/** 1-based inclusive line ranges (content only, no @import tailwind). */
const modules = [
  { file: "tokens.css", start: 3, end: 65 },
  { file: "shell.css", start: 66, end: 138 },
  { file: "motion.css", start: 139, end: 160 },
  { file: "landing-pages.css", start: 161, end: 2669 },
  { file: "upload.css", start: 2670, end: 2848 },
  { file: "controls.css", start: 2849, end: 2889 },
  { file: "workspace-layout.css", start: 2890, end: 2997 },
  { file: "tools-browse.css", start: 2998, end: 3108 },
  { file: "forms.css", start: 3109, end: 3166 },
  { file: "editors-shared.css", start: 3167, end: 3232 },
  { file: "editors-media.css", start: 3233, end: 3521 },
  { file: "editors-pdf.css", start: 3522, end: 3689 },
  { file: "tool-workspace.css", start: 3690, end: 3783 },
  { file: "responsive.css", start: 3784, end: 4277 },
  { file: "workspace-ui.css", start: 4278, end: 4834 },
  { file: "selected-tool.css", start: 4835, end: 5245 },
  { file: "pdf-layout.css", start: 5246, end: 5449 },
];

if (!fs.existsSync(sourcePath)) {
  console.error("Missing app/globals.monolith.css — keep a backup monolith before re-splitting.");
  process.exit(1);
}
const lines = fs.readFileSync(sourcePath, "utf8").split(/\r?\n/);

fs.mkdirSync(stylesDir, { recursive: true });

for (const { file, start, end } of modules) {
  const chunk = lines.slice(start - 1, end).join("\n").trimEnd();
  fs.writeFileSync(path.join(stylesDir, file), `${chunk}\n`, "utf8");
}

const imports = modules.map(({ file }) => `@import "./${file}";`).join("\n");
const mainCss = `/* Global styles entry (import from app/layout.tsx). */\n@import "tailwindcss";\n\n${imports}\n`;
fs.writeFileSync(path.join(stylesDir, "main.css"), mainCss, "utf8");

console.log(`Split ${lines.length} lines into ${modules.length} files under app/styles/`);
