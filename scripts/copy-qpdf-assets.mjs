import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pkgRoot = join(root, "node_modules", "qpdf-run");
const outRoot = join(root, "public", "qpdf");

const copies = [
  [join(pkgRoot, "src", "worker.js"), join(outRoot, "worker.js")],
  [join(pkgRoot, "vendor", "qpdf", "lib", "qpdf.js"), join(outRoot, "lib", "qpdf.js")],
  [join(pkgRoot, "vendor", "qpdf", "lib", "qpdf.wasm"), join(outRoot, "lib", "qpdf.wasm")],
];

if (!existsSync(pkgRoot)) {
  console.error("qpdf-run is not installed. Run npm install.");
  process.exit(1);
}

for (const [, target] of copies) {
  mkdirSync(dirname(target), { recursive: true });
}

for (const [source, target] of copies) {
  copyFileSync(source, target);
}

console.log("Copied qpdf WASM assets to public/qpdf/");
