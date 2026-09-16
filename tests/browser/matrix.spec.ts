import { expect, test, type Page } from "@playwright/test";
import { PDFDocument } from "pdf-lib";
import { expectVideoEditorCapability, readVideoFixture } from "./fixtures";

type Upload = { name: string; mimeType: string; buffer: Buffer };

async function open(page: Page) {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Choose files to upload" })).toBeVisible();
}

async function upload(page: Page, file: Upload | Upload[]) {
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
}

async function makeJpg(page: Page) {
  return Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 32;
    canvas.height = 24;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#d97706";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("JPG encoding failed")), "image/jpeg"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }));
}

async function makePdf() {
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  return Buffer.from(await document.save());
}

function makeWav() {
  const sampleRate = 8_000;
  const samples = sampleRate;
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
  return buffer;
}

const deferredFiles: Upload[] = [
  { name: "deferred.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from("PK\x03\x04docx") },
  { name: "deferred.pptx", mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", buffer: Buffer.from("PK\x03\x04pptx") },
  { name: "deferred.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("PK\x03\x04xlsx") },
  { name: "deferred.txt", mimeType: "text/plain", buffer: Buffer.from("plain text") },
  { name: "deferred.zip", mimeType: "application/zip", buffer: Buffer.from("PK\x05\x06") },
  { name: "corrupt.mp3", mimeType: "audio/mpeg", buffer: Buffer.from("not an MP3") },
  { name: "corrupt.bin", mimeType: "application/octet-stream", buffer: Buffer.from("not a media file") },
];

test.describe("browser file matrix", () => {
  test("covers PNG, JPG, PDF, audio, deferred files, and corrupt media", async ({ page }) => {
    test.setTimeout(120_000);
    const files: Upload[] = [
      { name: "matrix.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") },
      { name: "matrix.jpg", mimeType: "image/jpeg", buffer: await makeJpg(page) },
      { name: "matrix.pdf", mimeType: "application/pdf", buffer: await makePdf() },
      { name: "matrix.wav", mimeType: "audio/wav", buffer: makeWav() },
      ...deferredFiles,
    ];

    for (const file of files) {
      await open(page);
      await upload(page, file);
      await expect(page.getByText(file.name)).toBeVisible();
      if (file.name.endsWith(".png") || file.name.endsWith(".jpg")) {
        await expect(page.getByRole("button", { name: /Resize & compress/ })).toBeVisible();
      } else if (file.name.endsWith(".pdf")) {
        await expect(page.getByRole("button", { name: /Rotate PDFs/ })).toBeVisible();
      } else if (file.name.endsWith(".wav")) {
        await expect(page.getByRole("button", { name: /Trim audio/ })).toBeVisible();
      } else if (file.name === "corrupt.mp3") {
        await expect(page.getByText(/audio ·/)).toBeVisible();
        await expect(page.getByRole("button", { name: /Trim audio/ })).toBeVisible();
      } else if (file.name.endsWith(".docx") || file.name.endsWith(".pptx") || file.name.endsWith(".xlsx") || file.name.endsWith(".txt") || file.name.endsWith(".zip")) {
        await expect(page.getByText(/Detected .* More tools are coming soon\./)).toBeVisible();
      } else {
        await expect(page.getByText("No local tools support this file.")).toBeVisible();
      }
    }
  });

  test("uploads MP4 and verifies capability-aware video editing", async ({ page }) => {
    test.setTimeout(180_000);
    const mp4 = readVideoFixture();
    await open(page);
    await upload(page, { name: "matrix.mp4", mimeType: "video/mp4", buffer: mp4 });
    await expect(page.getByText("matrix.mp4")).toBeVisible();
    await expect(page.getByText(/MP4 video ·/)).toBeVisible();
    await expect(page.getByRole("button", { name: /Trim video/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /Change speed/ })).toBeVisible();
    await page.getByRole("button", { name: /Trim video/ }).click();

    const supported = await expectVideoEditorCapability(page, "matrix.mp4");
    if (!supported) return;

    const editor = page.getByRole("region", { name: /Video editor for matrix.mp4/ });
    const outPoint = editor.getByRole("spinbutton", { name: "Out point" });
    await outPoint.fill("0.5");
    await editor.getByRole("button", { name: "Trim selection" }).click();
    const trimResult = page.locator("a[download]").first();
    await expect(trimResult).toBeVisible({ timeout: 120_000 });
    const trimDownload = page.waitForEvent("download");
    await trimResult.click();
    await trimDownload;
  });

  test("runs speed and frame extraction when MP4 duration is available", async ({ page }) => {
    test.setTimeout(180_000);
    const mp4 = readVideoFixture();
    await open(page);
    await upload(page, { name: "actions.mp4", mimeType: "video/mp4", buffer: mp4 });
    await page.getByRole("button", { name: /Change speed/ }).click();
    const supported = await expectVideoEditorCapability(page, "actions.mp4");
    if (!supported) return;
    await page.getByLabel("Speed").selectOption("1.5");
    await page.getByRole("button", { name: "Apply 1.5× speed" }).click();
    const speedResult = page.locator("a[download]").first();
    await expect(speedResult).toBeVisible({ timeout: 120_000 });
    const speedDownload = page.waitForEvent("download");
    await speedResult.click();
    await speedDownload;

    await page.getByRole("button", { name: "Clear all" }).click();
    await upload(page, { name: "frames.mp4", mimeType: "video/mp4", buffer: mp4 });
    await page.getByRole("button", { name: /Extract frames/ }).click();
    const framesSupported = await expectVideoEditorCapability(page, "frames.mp4");
    if (!framesSupported) return;
    await page.getByRole("button", { name: "Extract frames" }).click();
    const framesResult = page.locator("a[download]").first();
    await expect(framesResult).toBeVisible({ timeout: 120_000 });
    const framesDownload = page.waitForEvent("download");
    await framesResult.click();
    await framesDownload;
  });

  test("supports file switching, removal, keyboard upload, cancellation, and mobile layout", async ({ page }) => {
    test.setTimeout(120_000);
    const png: Upload = { name: "switch.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64") };
    const wav: Upload = { name: "switch.wav", mimeType: "audio/wav", buffer: makeWav() };
    await open(page);
    const dropZone = page.getByRole("button", { name: "Choose files to upload" });
    await dropZone.focus();
    await page.keyboard.press("Enter");
    await page.locator('input[type="file"]').setInputFiles([png, wav]);
    await expect(page.getByText("switch.png")).toBeVisible();
    await expect(page.getByText("switch.wav")).toBeVisible();
    await page.getByRole("button", { name: "Remove switch.png" }).click();
    await expect(page.getByText("switch.png")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Trim audio/ })).toBeVisible();
    await page.getByRole("button", { name: "Clear all files" }).click();
    await expect(dropZone).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await upload(page, png);
    await expect(page.getByRole("separator", { name: "Resize layout" })).toBeHidden();
    await page.getByRole("button", { name: /Resize & compress/ }).click();
    await page.getByRole("button", { name: "Run Tool" }).click();
    await expect(page.locator('a[download]').first()).toBeVisible({ timeout: 30_000 });
  });
});
