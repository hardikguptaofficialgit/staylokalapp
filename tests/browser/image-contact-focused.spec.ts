import { expect, test } from "@playwright/test";

const pixel = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=", "base64");

test("creates a local image contact sheet", async ({ page }) => {
  await page.goto("/");
  await page.locator('input[type="file"]').setInputFiles([
    { name: "first.png", mimeType: "image/png", buffer: pixel },
    { name: "second.png", mimeType: "image/png", buffer: pixel },
  ]);
  await page.getByRole("button", { name: "Image contact sheet" }).click();
  await page.getByRole("spinbutton", { name: "Columns" }).fill("2");
  await page.getByRole("combobox", { name: "Output format" }).selectOption("image/png");
  await page.getByRole("button", { name: "Run Tool" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "images-contact-sheet.png" })).toHaveAttribute("download", "images-contact-sheet.png");
});
