import { expect, test } from "@playwright/test";

test("formats JSON and round-trips Base64 in the browser", async ({ page }) => {
  test.setTimeout(60_000);
  const json = Buffer.from('{"ok":true,"items":[1,2]}', "utf8");
  const text = Buffer.from("local", "utf8");

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "data.json",
    mimeType: "application/json",
    buffer: json,
  });
  await page.getByRole("button", { name: /Format JSON/ }).click();
  await page.getByRole("button", { name: "Format JSON" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
  await expect(page.getByRole("link", { name: /data-formatted\.json/i })).toBeVisible();

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "payload.txt",
    mimeType: "text/plain",
    buffer: text,
  });
  await page.getByRole("button", { name: /Encode Base64/ }).click();
  await page.getByRole("button", { name: "Encode Base64" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  const download = page.getByRole("link", { name: /payload\.base64\.txt/i });
  await expect(download).toBeVisible();
});
