import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("creates a local PDF contact sheet", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  document.addPage([120, 80]);
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "contact-source.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByRole("button", { name: "PDF contact sheet" }).click();
  await page.getByRole("spinbutton", { name: "Columns" }).fill("2");
  await page.getByRole("button", { name: /Run tool/i }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "contact-source-contact-sheet.pdf" })).toHaveAttribute("download", "contact-source-contact-sheet.pdf");
});

test("crops PDF pages locally", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "crop-source.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByRole("button", { name: "Crop PDF pages" }).click();
  await page.getByRole("button", { name: /Run tool/i }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "crop-source-cropped.pdf" })).toHaveAttribute("download", "crop-source-cropped.pdf");
});

test("resizes PDF pages to A4 locally", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "size-source.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByRole("button", { name: "Resize PDF pages" }).click();
  await page.getByRole("combobox", { name: "Page size" }).selectOption("a4");
  await page.getByRole("button", { name: /Run tool/i }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "size-source-a4.pdf" })).toHaveAttribute("download", "size-source-a4.pdf");
});

test("renders the PDF preview on a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const document = await PDFDocument.create();
  document.addPage([120, 80]);
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "mobile-preview.pdf",
    mimeType: "application/pdf",
    buffer: pdf,
  });
  await page.getByRole("button", { name: "Merge PDFs" }).click();
  await expect(page.locator("canvas.pdf-canvas-document")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator("canvas.pdf-canvas-document")).toHaveJSProperty("width", 120);
});
