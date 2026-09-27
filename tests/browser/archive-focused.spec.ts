import { expect, test } from "@playwright/test";
import JSZip from "jszip";

test("inspects a ZIP and extracts a selected file locally", async ({ page }) => {
  test.setTimeout(60_000);
  const zip = new JSZip();
  zip.file("docs/readme.txt", "local readme");
  zip.file("data.csv", "name,score\nAda,10");
  zip.folder("images");
  const bytes = await zip.generateAsync({ type: "uint8array" });

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "bundle.zip",
    mimeType: "application/zip",
    buffer: Buffer.from(bytes),
  });
  await page.getByRole("button", { name: /Extract ZIP file/ }).click();
  const editor = page.getByRole("region", { name: "Archive editor" });
  await expect(editor).toContainText("docs/readme.txt");
  await editor.getByRole("button", { name: /docs\/readme\.txt/ }).click();
  await page.getByRole("button", { name: "Extract File" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
  await expect(page.getByRole("link", { name: /bundle-docs-readme\.txt/i })).toHaveAttribute("download", "bundle-docs-readme.txt");
});

test("creates a ZIP archive from multiple queued files", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  const input = page.locator('input[aria-label="Choose files"]');
  await input.setInputFiles([
    { name: "alpha.txt", mimeType: "text/plain", buffer: Buffer.from("alpha") },
    { name: "beta.txt", mimeType: "text/plain", buffer: Buffer.from("beta") },
  ]);
  await page.getByRole("button", { name: /Create ZIP/ }).click();
  await expect(page.getByRole("region", { name: "ZIP creation" })).toContainText("2 files");
  await page.getByRole("button", { name: "Create ZIP" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
  await expect(page.getByRole("link", { name: /archive\.zip/i })).toHaveAttribute("download", "archive.zip");
});
