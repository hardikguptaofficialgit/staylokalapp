import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "app", "icon.png");
const outDir = path.join(root, "public", "images", "pwa");
const background = { r: 8, g: 8, b: 8, alpha: 1 };

async function writeSquareIcon(size, filename) {
  const buffer = await sharp(source)
    .resize(size, size, {
      background,
      fit: "contain",
    })
    .png({ compressionLevel: 9 })
    .toBuffer();

  await writeFile(path.join(outDir, filename), buffer);
  const meta = await sharp(buffer).metadata();
  if (meta.width !== size || meta.height !== size) {
    throw new Error(`${filename} is ${meta.width}x${meta.height}, expected ${size}x${size}`);
  }
}

await mkdir(outDir, { recursive: true });
await writeSquareIcon(192, "icon-192.png");
await writeSquareIcon(512, "icon-512.png");
await writeSquareIcon(180, "apple-touch-icon.png");

const favicon32 = await sharp(source)
  .resize(32, 32, { background, fit: "contain" })
  .png()
  .toBuffer();
await writeFile(path.join(outDir, "favicon-32.png"), favicon32);

console.log("PWA icons written to public/images/pwa/");
