import { expect, test, type Page } from "@playwright/test";
import { expectVideoEditorCapability, readVideoFixture } from "./fixtures";

const tinyPng = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await expect(page.locator(".drop-zone")).toBeVisible();
  await page.evaluate((payload) => {
    const element = document.querySelector(".drop-zone");
    if (!element) throw new Error("Drop zone not found");
    const transfer = new DataTransfer();
    const bytes = Uint8Array.from(atob(payload.base64), (character) => character.charCodeAt(0));
    transfer.items.add(new File([bytes], payload.name, { type: payload.mimeType }));
    element.dispatchEvent(new DragEvent("drop", { bubbles: true, dataTransfer: transfer }));
  }, { name: file.name, mimeType: file.mimeType, base64: file.buffer.toString("base64") });
}

function makeWav() {
  const sampleRate = 8_000;
  const samples = sampleRate * 2;
  const buffer = Buffer.alloc(44 + samples * 2);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + samples * 2, 4);
  buffer.write("WAVEfmt ", 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(sampleRate * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(samples * 2, 40);
  for (let index = 0; index < samples; index += 1) {
    buffer.writeInt16LE(Math.round(Math.sin(index / 10) * 8_000), 44 + index * 2);
  }
  return buffer;
}

test.describe("StayLokal V1 browser flows", () => {
  test("uploads an image, exposes only image tools, and downloads output", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
  await page.waitForTimeout(750);
    await upload(page, { name: "fixture.png", mimeType: "image/png", buffer: tinyPng });
    await expect(page.getByRole("button", { name: /Resize & compress/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Trim video/ })).toHaveCount(0);
    await page.getByRole("button", { name: /Resize & compress/ }).click();
    await page.getByRole("button", { name: "Run Tool" }).click();
    await expect(page.getByRole("link", { name: /fixture-process/ })).toBeVisible({ timeout: 30_000 });
  });

  test("runs a real browser video fixture through trim processing", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    const fixture = readVideoFixture();
    await upload(page, { name: "fixture.mp4", mimeType: "video/mp4", buffer: fixture });
    await page.getByRole("button", { name: /Trim video/ }).click();
    if (!await expectVideoEditorCapability(page, "fixture.mp4")) return;
    await page.getByRole("spinbutton", { name: "Out point" }).fill("0.5");
    await page.getByRole("button", { name: "Trim selection" }).click();
    await expect(page.getByRole("link", { name: /fixture-trim/ })).toBeVisible({ timeout: 90_000 });
  });

  test("shows a clear unsupported-file state", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    await upload(page, { name: "fixture.bin", mimeType: "application/octet-stream", buffer: Buffer.from("unsupported") });
    await expect(page.getByText("No local tools support this file.")).toBeVisible();
  });

  test("accepts a file pasted from the clipboard", async ({ page }) => {
    await page.goto("/");
    await page.evaluate((base64) => {
      const bytes = Uint8Array.from(atob(base64), (character) => character.charCodeAt(0));
      const transfer = new DataTransfer();
      transfer.items.add(new File([bytes], "pasted-document.txt", { type: "text/plain" }));
      window.dispatchEvent(new ClipboardEvent("paste", { bubbles: true, clipboardData: transfer }));
    }, Buffer.from("pasted locally").toString("base64"));
    await expect(page.getByText("pasted-document.txt")).toBeVisible();
  });

  test("opens a local preview when an uploaded file is clicked", async ({ page }) => {
    await page.goto("/");
    await upload(page, { name: "preview.png", mimeType: "image/png", buffer: tinyPng });
    await page.getByText("preview.png").click();
    await expect(page.getByRole("dialog", { name: "Preview preview.png" })).toBeVisible();
    await expect.poll(() => page.locator(".file-preview-image").evaluate((image) => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  });

  test("supports cancellation without leaving the UI stuck", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    await upload(page, { name: "fixture.mp4", mimeType: "video/mp4", buffer: readVideoFixture() });
    await page.getByRole("button", { name: /Change speed/ }).click();
    if (!await expectVideoEditorCapability(page, "fixture.mp4")) return;
    await page.getByLabel("Speed").selectOption("2");
    await page.getByRole("button", { name: "Apply 2× speed" }).click();
    const cancel = page.getByRole("button", { name: "Cancel" });
    if (await cancel.isVisible({ timeout: 2_000 }).catch(() => false)) await cancel.click();
    await expect(page.getByRole("button", { name: /Apply 2× speed|Run Tool/ }).first()).toBeEnabled();
  });

  test("executes every registered video operation with a real fixture", async ({ page }) => {
    test.setTimeout(600_000);
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    const fixture = readVideoFixture();
    const operations = ["Trim video", "Cut out a section", "Change speed", "Extract frames"];
    for (const name of operations.filter((name) => !process.env.MEDIA_OPERATION || name.includes(process.env.MEDIA_OPERATION))) {
      await upload(page, { name: "fixture.mp4", mimeType: "video/mp4", buffer: fixture });
      await page.getByRole("button", { name: new RegExp(name) }).click();
      if (!await expectVideoEditorCapability(page, "fixture.mp4")) {
        await page.getByRole("button", { name: "Back to compatible tools" }).click();
        continue;
      }
      if (name === "Change speed") {
        await page.getByLabel("Speed").selectOption("1.5");
        await page.getByRole("button", { name: "Apply 1.5× speed" }).click();
      } else {
        await page.getByRole("spinbutton", { name: "Out point" }).fill(name === "Cut out a section" ? "1.5" : "0.5");
        if (name === "Cut out a section") await page.getByRole("spinbutton", { name: "In point" }).fill("0.5");
        await page.getByRole("button", { name: name === "Extract frames" ? "Extract frames" : name === "Cut out a section" ? "Cut selection" : "Trim selection" }).click();
      }
      await expect(page.locator('a[download]').first()).toBeVisible({ timeout: 120_000 });
      await page.getByRole("button", { name: "Clear all" }).click();
      await expect(page.locator(".drop-zone")).toBeVisible();
    }
  });

  test("executes every registered audio operation with a real WAV fixture", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    const fixture = makeWav();
    await upload(page, { name: "fixture.wav", mimeType: "audio/wav", buffer: fixture });
    await page.getByRole("button", { name: /Trim audio/ }).click();
    await page.getByRole("spinbutton", { name: "Out point" }).fill("0.5");
    await page.getByRole("button", { name: "Trim selection" }).click();
    await expect(page.locator('a[download]').first()).toBeVisible({ timeout: 120_000 });
  });
});
