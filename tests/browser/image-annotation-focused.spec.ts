import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("places a local image on a rendered PDF page", async ({ page }) => {
  const document = await PDFDocument.create();
  document.addPage([320, 240]);
  const pdf = Buffer.from(await document.save());
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "annotate.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: /Add image annotation/ }).click();

  const editor = page.getByRole("region", { name: "Add image annotation" });
  await editor.locator('input[type="file"]').setInputFiles({ name: "stamp.png", mimeType: "image/png", buffer: png });
  await expect(editor.getByAltText("Selected annotation preview")).toBeVisible();
  await editor.getByRole("button", { name: "Add image" }).click();

  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "image-annotated.pdf" })).toBeVisible();
});
