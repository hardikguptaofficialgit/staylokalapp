import { expect, test, type Page } from "@playwright/test";

async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.evaluate((payload: { name: string; mimeType: string; base64: string }) => {
    const dropZone = document.querySelector(".drop-zone, .workspace-sidebar");
    if (!dropZone) throw new Error("Drop zone not found");
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(atob(payload.base64), (character) => character.charCodeAt(0));
    transfer.items.add(new File([bytes], payload.name, { type: payload.mimeType }));
    dropZone.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
  }, { name: file.name, mimeType: file.mimeType, base64: file.buffer.toString("base64") });
}

test("runs the newly exposed local image tools", async ({ page }) => {
  test.setTimeout(180_000);
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");
  const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" fill="#36a"/><circle cx="32" cy="32" r="20" fill="#fff"/></svg>');
  for (const tool of ["Rotate image", "Flip image", "Create thumbnail"]) {
    await page.goto("/");
    await upload(page, { name: "image.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: tool }).click();
    await page.getByRole("button", { name: /Run Tool/ }).click();
    await expect(page.getByText("Completed Locally")).toBeVisible({
      timeout: tool === "Upscale image" ? 120_000 : 30_000,
    });
  }

  for (const tool of ["Convert image", "Upscale image", "Watermark image", "Meme generator"]) {
    await page.goto("/");
    await upload(page, tool === "Upscale image"
      ? { name: "image.svg", mimeType: "image/svg+xml", buffer: svg }
      : { name: "image.png", mimeType: "image/png", buffer: png });
    await page.getByRole("button", { name: tool }).click();
    if (tool === "Watermark image") await page.getByLabel("Text").fill("Local");
    if (tool === "Meme generator") {
      await page.getByLabel("Top text").fill("TOP");
      await page.getByLabel("Bottom text").fill("BOTTOM");
    }
    await page.getByRole("button", { name: /Run Tool/ }).click();
    await expect(page.getByText("Completed Locally")).toBeVisible({
      timeout: tool === "Upscale image" ? 120_000 : 30_000,
    });
  }

  await page.goto("/");
  await upload(page, { name: "frame-1.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: "Add files" }).click();
  await upload(page, { name: "frame-2.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: /Create animated GIF/ }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /animated\.gif/i })).toBeVisible();

  await page.goto("/");
  await upload(page, { name: "subject.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: /Remove background/ }).click();
  await expect.poll(() => page.locator(".image-background-preview img").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 120_000 });
  await expect(page.getByRole("link", { name: "subject-no-background.png" })).toBeVisible();
});
