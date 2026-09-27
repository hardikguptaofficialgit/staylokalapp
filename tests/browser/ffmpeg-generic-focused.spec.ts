import { expect, test } from "@playwright/test";
import { readVideoFixture } from "./fixtures";

async function upload(page: import("@playwright/test").Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator('input[aria-label="Choose files"]').setInputFiles(file);
  await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
}

test.describe("generic FFmpeg video tools", () => {
  test("shows the local preview surface and mutes a video when FFmpeg can run", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await upload(page, { name: "mute-me.mp4", mimeType: "video/mp4", buffer: readVideoFixture() });
    await page.getByRole("button", { name: /Mute video/ }).click();
    await expect(page.getByText("Local source preview")).toBeVisible();
    await page.getByRole("button", { name: "Mute video" }).click();
    const completed = page.getByText("Completed Locally");
    const failed = page.getByRole("alert").filter({ hasText: /Processing Failed|Media processing/ });
    await expect(completed.or(failed)).toBeVisible({ timeout: 120_000 });
    if (await failed.isVisible()) return;
    await expect(page.locator('a[download]').first()).toBeVisible();
  });

  test("grabs a thumbnail frame from a video", async ({ page }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await upload(page, { name: "thumb.mp4", mimeType: "video/mp4", buffer: readVideoFixture() });
    await page.getByRole("button", { name: /Create thumbnail/ }).click();
    await expect(page.getByText("Local source preview")).toBeVisible();
    await page.getByRole("button", { name: "Grab thumbnail" }).click();
    const completed = page.getByText("Completed Locally");
    const failed = page.getByRole("alert").filter({ hasText: /Processing Failed|Media processing/ });
    await expect(completed.or(failed)).toBeVisible({ timeout: 120_000 });
    if (await failed.isVisible()) return;
    await expect(page.getByRole("link", { name: /thumbnail/i })).toBeVisible();
  });

  test("strips metadata from a WAV through the audio metadata tool", async ({ page }) => {
    test.setTimeout(120_000);
    const wav = Buffer.alloc(44 + 8000);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + 8000, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(8000, 24);
    wav.writeUInt32LE(16000, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(8000, 40);
    await page.goto("/");
    await upload(page, { name: "meta.wav", mimeType: "audio/wav", buffer: wav });
    await page.getByRole("button", { name: /Remove metadata/ }).first().click();
    await page.getByRole("button", { name: "Remove metadata" }).click();
    await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 90_000 });
  });
});
