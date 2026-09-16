import { expect, test } from "@playwright/test";

function makeBmp() {
  const buffer = Buffer.alloc(58);
  buffer.write("BM", 0);
  buffer.writeUInt32LE(58, 2);
  buffer.writeUInt32LE(54, 10);
  buffer.writeUInt32LE(40, 14);
  buffer.writeInt32LE(1, 18);
  buffer.writeInt32LE(1, 22);
  buffer.writeUInt16LE(1, 26);
  buffer.writeUInt16LE(24, 28);
  buffer.writeUInt32LE(4, 34);
  buffer[54] = 0x36;
  buffer[55] = 0xa0;
  buffer[56] = 0xff;
  return buffer;
}

test("processes browser-decodable SVG, BMP, and AVIF images locally", async ({ page }) => {
  test.setTimeout(90_000);
  const avif = await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 2;
    canvas.height = 2;
    canvas.getContext("2d")?.fillRect(0, 0, 2, 2);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/avif"));
    if (!blob || blob.type !== "image/avif") return null;
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  });
  const cases = [
    { name: "icon.svg", mimeType: "image/svg+xml", buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2" fill="red"/></svg>') },
    { name: "photo.bmp", mimeType: "image/bmp", buffer: makeBmp() },
    ...(avif ? [{ name: "photo.avif", mimeType: "image/avif", buffer: Buffer.from(avif) }] : []),
  ];

  for (const file of cases) {
    await page.goto("/");
    await page.locator('input[aria-label="Choose files"]').setInputFiles(file);
    await expect(page.getByText(file.name)).toBeVisible();
    await page.getByRole("button", { name: /Resize & compress/ }).click();
    await page.getByRole("button", { name: /Run Tool/ }).click();
    await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  }
});
