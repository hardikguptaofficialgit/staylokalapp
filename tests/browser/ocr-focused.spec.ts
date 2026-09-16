import { expect, test } from "@playwright/test";
import { PDFDocument, StandardFonts } from "pdf-lib";

test("runs self-hosted OCR and creates a searchable PDF", async ({ page }) => {
  const document = await PDFDocument.create();
  const pdfPage = document.addPage([500, 220]);
  const font = await document.embedFont(StandardFonts.Helvetica);
  pdfPage.drawText("StayLokal local OCR", { x: 40, y: 110, size: 24, font });
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "ocr.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: /OCR searchable PDF/ }).click();
  await page.getByRole("button", { name: /Run tool/ }).click();

  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("link", { name: "ocr-searchable.pdf" })).toBeVisible();
  await expect(page.getByRole("link", { name: "ocr.txt" })).toBeVisible();
});
