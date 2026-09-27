import fs from "node:fs";
import path from "node:path";

const root = path.join(import.meta.dirname, "..", "app");

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!entry.name.startsWith(".") && entry.name !== "node_modules") walk(full);
      continue;
    }
    if (!entry.name.endsWith(".css")) continue;
    let text = fs.readFileSync(full, "utf8");
    if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
    const trimmed = text.trimStart();
    if (trimmed.startsWith('"use client"') || trimmed.startsWith("'use client'")) {
      console.error(`CSS file starts with use client (invalid): ${full}`);
      process.exitCode = 1;
      continue;
    }
    if (text !== fs.readFileSync(full, "utf8")) {
      fs.writeFileSync(full, text, "utf8");
      console.log(`fixed BOM: ${path.relative(path.join(import.meta.dirname, ".."), full)}`);
    }
  }
}

walk(root);
