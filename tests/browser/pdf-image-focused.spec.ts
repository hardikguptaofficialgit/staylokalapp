import { expect, test } from "@playwright/test";

const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("keeps the JPG/PNG to PDF image preview available", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles({
    name: "pixel.png",
    mimeType: "image/png",
    buffer: pixel,
  });
  await page.getByRole("button", { name: "JPG/PNG → PDF" }).click();
  await expect(page.getByRole("img", { name: "pixel.png preview" })).toBeVisible();
  await page.getByRole("button", { name: "Create PDF" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
});
