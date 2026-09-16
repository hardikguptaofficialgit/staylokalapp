import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("extracts DOCX text and previews TXT locally", async ({ page }) => {
  test.setTimeout(60_000);
  const zip = new JSZip();
  zip.file("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>First paragraph</w:t></w:r></w:p><w:p><w:r><w:t>Second paragraph</w:t></w:r></w:p></w:body></w:document>");
  const docx = Buffer.from(await zip.generateAsync({ type: "uint8array" }));

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "sample.docx",
    mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    buffer: docx,
  });
  await page.getByRole("button", { name: /Extract document text/ }).click();
  await expect(page.getByRole("region", { name: "Document editor" })).toContainText("DOCX text");
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
  await expect(page.getByRole("link", { name: /sample-text\.txt/i })).toHaveAttribute("download", "sample-text.txt");

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "notes.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("Private local notes"),
  });
  await page.getByRole("button", { name: /Preview text file/ }).click();
  await expect(page.getByRole("region", { name: "Document editor" })).toContainText("Private local notes");
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
  await expect(page.getByRole("link", { name: /notes-text\.txt/i })).toHaveAttribute("download", "notes-text.txt");
});

test("extracts a legacy DOC locally", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "legacy-word.doc",
    mimeType: "application/msword",
    buffer: readFileSync(resolve(process.cwd(), "tests/fixtures/legacy-word.doc")),
  });
  await page.getByRole("button", { name: /Extract document text/ }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: /legacy-word-text\.txt/i })).toHaveAttribute("download", "legacy-word-text.txt");
});
