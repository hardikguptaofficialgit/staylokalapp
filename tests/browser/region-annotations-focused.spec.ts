import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("exports highlight, rectangle, and redaction regions", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([600, 800]);
  const pdf = Buffer.from(await document.save());

  for (const tool of ["Highlight a region", "Add rectangle", "Redact a region"]) {
    await page.goto("/");
    await page.locator('input[type="file"]').first().setInputFiles({ name: "regions.pdf", mimeType: "application/pdf", buffer: pdf });
    await page.getByRole("button", { name: tool }).click();
    await expect(page.getByRole("region", { name: tool })).toBeVisible();
    await page.getByRole("button", { name: /Run tool/ }).click();
    await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  }
});
