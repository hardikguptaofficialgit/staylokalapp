import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { expectVideoEditorCapability, readVideoFixture } from "./fixtures";

async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator('input[type="file"]').setInputFiles({
    name: file.name,
    mimeType: file.mimeType,
    buffer: file.buffer,
  });
  await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
}

async function makePdf() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const label of ["First page", "Second page"]) {
    const page = document.addPage([320, 220]);
    page.drawText(label, { x: 40, y: 160, size: 24, font, color: rgb(0, 0, 0) });
  }
  return Buffer.from(await document.save());
}

async function makeImage(page: Page) {
  return Buffer.from(await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 200;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas is unavailable");
    context.fillStyle = "#d97706";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "#172554";
    context.fillRect(80, 40, 160, 120);
    const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("PNG encoding failed")), "image/png"));
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }));
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
  for (let index = 0; index < samples; index += 1) {
    buffer.writeInt16LE(Math.round(Math.sin(index / 10) * 8_000), 44 + index * 2);
  }
  return buffer;
}

async function openImageTool(page: Page, name: string) {
  await page.getByRole("button", { name: new RegExp(name) }).click();
  await expect(page.getByRole("region", { name: "Image editor" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Image preview" })).toBeVisible();
}

test.describe("visual editor browser flows", () => {
  test("edits PDF pages visually and downloads the exported document", async ({ page }) => {
    await page.goto("/");
    await upload(page, { name: "editable.pdf", mimeType: "application/pdf", buffer: await makePdf() });
    await page.getByRole("button", { name: /Rotate PDFs/ }).click();

    const editor = page.getByRole("region", { name: "PDF page editor" });
    await expect(editor).toBeVisible();
    await expect(editor.getByText("Visual PDF editor")).toBeVisible();
    await expect(page.getByRole("button", { name: "Select page 1" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Select page 2" })).toBeVisible();
    await page.getByRole("button", { name: "Select page 2" }).click();
    await expect(editor.getByText("Page 2 of 2")).toBeVisible();
    await editor.getByRole("button", { name: "Rotate" }).click();

    await editor.getByRole("button", { name: "Export PDF" }).click();
    const result = page.locator('a[download="rotated-pdf.pdf"]');
    await expect(result).toBeVisible();
    const download = page.waitForEvent("download");
    await result.click();
    await download;
  });

  test("crops and resizes an image through the visual editor", async ({ page }) => {
    await page.goto("/");
    const image = await makeImage(page);
    await upload(page, { name: "editable.png", mimeType: "image/png", buffer: image });
    await openImageTool(page, "Crop image");

    const cropEditor = page.getByRole("region", { name: "Image editor" });
    await expect(cropEditor.getByLabel("Width")).toHaveValue("320");
    await expect(cropEditor.getByLabel("Height")).toHaveValue("200");
    await cropEditor.getByLabel("Width").fill("160");
    await cropEditor.getByLabel("Height").fill("100");
    await page.getByRole("button", { name: "Back to compatible tools" }).click();

    await openImageTool(page, "Resize & compress");
    await page.getByLabel("Width").fill("160");
    await page.getByRole("button", { name: "Run Tool" }).click();
    await expect(page.locator('a[download="editable-process.jpg"]')).toBeVisible();
  });

  test("supports keyboard interaction for the workspace divider and image controls", async ({ page }) => {
    await page.goto("/");
    await upload(page, { name: "keyboard.png", mimeType: "image/png", buffer: await makeImage(page) });
    const divider = page.getByRole("separator", { name: "Resize layout" });
    await divider.focus();
    const before = Number(await divider.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowRight");
    await expect(divider).toHaveAttribute("aria-valuenow", String(before + 2));

    await page.getByRole("button", { name: /Crop image/ }).focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Image editor" })).toBeVisible();
    await page.getByLabel("Width").focus();
    await page.keyboard.press("ArrowDown");
  });

  test("keeps the upload workspace usable on a mobile touch viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await upload(page, { name: "mobile.png", mimeType: "image/png", buffer: await makeImage(page) });
    await expect(page.getByRole("separator", { name: "Resize layout" })).toBeHidden();
    await page.getByRole("button", { name: /Crop image/ }).click();
    await expect(page.getByRole("region", { name: "Image editor" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Resize crop se" })).toBeVisible();
  });
});

test.describe("media editor integration coverage", () => {
  test("provides a keyboard and pointer video timeline for trim selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    await upload(page, { name: "timeline.mp4", mimeType: "video/mp4", buffer: readVideoFixture() });
    await page.getByRole("button", { name: /Trim video/ }).click();
    const supported = await expectVideoEditorCapability(page, "timeline.mp4");
    if (!supported) return;
    await expect(page.getByRole("slider", { name: "In point" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trim selection" })).toBeVisible();
    await expect(page.locator(".timeline-ruler")).toBeVisible();
    await expect(page.getByText(/Selected/)).toBeVisible();
    await page.getByRole("region", { name: /Video editor/ }).press("r");
    await expect(page.getByRole("button", { name: "Trim selection" })).toBeEnabled();
  });

  test("provides a decoded audio waveform and range selection", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Drop your files right here")).toBeVisible();
    await upload(page, { name: "waveform.wav", mimeType: "audio/wav", buffer: makeWav() });
    await page.getByRole("button", { name: /Trim audio/ }).click();
    await expect(page.getByRole("region", { name: /Audio editor/ })).toBeVisible();
    await expect(page.getByRole("slider", { name: "In point" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Trim selection" })).toBeVisible();
    await expect(page.getByText(/Selected/)).toBeVisible();
  });

  test("converts a WAV locally through the audio FFmpeg tool", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto("/");
    await upload(page, { name: "convert.wav", mimeType: "audio/wav", buffer: makeWav() });
    await page.getByRole("button", { name: "Convert audio" }).click();
    await page.getByRole("button", { name: /Run Tool/ }).click();
    await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 60_000 });
    await expect(page.getByRole("link", { name: /convert-convert-audio-001\.mp3/i })).toHaveAttribute("download", "convert-convert-audio-001.mp3");
  });
});
