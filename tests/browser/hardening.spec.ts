import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, truncateSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { expectVideoEditorCapability, readVideoFixture } from "./fixtures";

type Upload = { name: string; mimeType: string; buffer: Buffer };

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function upload(page: Page, file: Upload) {
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
}

async function uploadPath(page: Page, path: string) {
  await page.locator('input[type="file"]').setInputFiles(path);
  await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
}

function corruptVideo(name = "corrupt.mp4"): Upload {
  return { name, mimeType: "video/mp4", buffer: Buffer.from("not a valid video container") };
}

test.describe("browser hardening", () => {
  test("keeps an oversized video visible and does not initialize an editor", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/");
    const oversizedPath = test.info().outputPath("oversized.mp4");
    mkdirSync(dirname(oversizedPath), { recursive: true });
    writeFileSync(oversizedPath, Buffer.alloc(0));
    truncateSync(oversizedPath, 512 * 1024 * 1024 + 1);
    await uploadPath(page, oversizedPath);

    await expect(page.getByText("oversized.mp4")).toBeVisible();
    await expect(page.getByText("Files larger than 512 MB cannot be processed locally.", { exact: true })).toBeVisible();
    await expect(page.getByRole("region", { name: /Video editor/ })).toHaveCount(0);
  });

  test("reports unsupported video capability without enabled fake controls", async ({ page }) => {
    await page.goto("/");
    await upload(page, corruptVideo());
    await page.getByRole("button", { name: /Trim video/ }).click();

    const editor = page.getByRole("region", { name: "Video editor for corrupt.mp4" });
    await expect(editor.locator("video")).toHaveAttribute("src", /^blob:/);
    await expect(editor.getByRole("alert")).toHaveText(
      /This browser does not support the file's video codec or container\. Try a browser-supported MP4 or WebM file\.|The file could not be decoded and may be corrupt or incomplete\. Try a browser-supported MP4 or WebM file\./,
    );
    const controls = editor.locator("button");
    await expect(controls).toHaveCount(0);
    await expect(editor.getByRole("slider", { name: "In point" })).toBeHidden();
    await expect(editor.getByRole("slider", { name: "Out point" })).toBeHidden();
  });

  test("covers metadata loading failure and switches video tools cleanly", async ({ page }) => {
    await page.goto("/");
    await upload(page, corruptVideo("metadata-failure.mp4"));

    await page.getByRole("button", { name: /Trim video/ }).click();
    const trimEditor = page.getByRole("region", { name: "Video editor for metadata-failure.mp4" });
    await expect(trimEditor.locator("video")).toHaveAttribute("src", /^blob:/);
    await expect(trimEditor.getByRole("alert")).toBeVisible();
    await page.getByRole("button", { name: "Back to compatible tools" }).click();
    await expect(page.getByRole("region", { name: /Video editor/ })).toHaveCount(0);

    await page.getByRole("button", { name: /Change speed/ }).click();
    const speedEditor = page.getByRole("region", { name: "Video editor for metadata-failure.mp4" });
    await expect(speedEditor.locator("video")).toHaveAttribute("src", /^blob:/);
    await expect(speedEditor.getByRole("alert")).toBeVisible();
    await expect.poll(() => speedEditor.locator("button").evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true);
  });

  test("branches on real supported-media capability and exposes its object URL", async ({ page }) => {
    await page.goto("/");
    await upload(page, { name: "supported.mp4", mimeType: "video/mp4", buffer: readVideoFixture() });
    await page.getByRole("button", { name: /Trim video/ }).click();

    const supported = await expectVideoEditorCapability(page, "supported.mp4");
    const editor = page.getByRole("region", { name: "Video editor for supported.mp4" });
    if (supported) {
      await expect(editor.getByRole("slider", { name: "In point" })).toBeVisible();
      await expect(editor.getByRole("button", { name: "Trim selection" })).toBeEnabled();
    } else {
      await expect(editor.getByRole("alert")).toBeVisible();
      await expect.poll(() => editor.locator("button").evaluateAll((buttons) => buttons.every((button) => (button as HTMLButtonElement).disabled))).toBe(true);
    }
    await expect(editor.locator("video")).toHaveAttribute("src", /^blob:/);
    await page.getByRole("button", { name: "Back to compatible tools" }).click();
    await expect(page.locator('section[aria-label^="Video editor for"] video')).toHaveCount(0);
  });

  test("keeps desktop, tablet, and mobile workspaces within the viewport", async ({ page }) => {
    for (const [width, dividerVisible] of [[1440, true], [768, false], [390, false]] as const) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await upload(page, { name: `layout-${width}.png`, mimeType: "image/png", buffer: tinyPng });
      await expect(page.getByText(`layout-${width}.png`)).toBeVisible();
      if (dividerVisible) {
        await expect(page.getByRole("separator", { name: "Resize layout" })).toBeVisible();
      } else {
        await expect(page.getByRole("separator", { name: "Resize layout" })).toBeHidden();
      }
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    }
  });
});
