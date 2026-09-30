import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("applies a drawn signature to a PDF page", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([320, 240]);
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "sign-me.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: /Sign PDF/ }).click();

  const editor = page.getByRole("region", { name: "Sign PDF" });
  await editor.getByRole("button", { name: "Draw signature" }).click();

  const modal = page.getByRole("dialog", { name: "Draw your signature" });
  const pad = modal.getByLabel("Signature drawing pad");
  const box = await pad.boundingBox();
  if (!box) throw new Error("Signature pad not visible");
  await page.mouse.move(box.x + 40, box.y + 80);
  await page.mouse.down();
  await page.mouse.move(box.x + 180, box.y + 100, { steps: 8 });
  await page.mouse.up();

  await modal.getByRole("button", { name: "Use signature" }).click();
  await editor.getByRole("button", { name: "Apply signature" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "signed.pdf" })).toBeVisible();
});
