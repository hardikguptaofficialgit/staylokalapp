import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, type Page } from "@playwright/test";

export function readVideoFixture() {
  return readFileSync(join(__dirname, "fixtures", "static-video.mp4"));
}

export async function expectVideoEditorCapability(page: Page, fileName: string) {
  const editor = page.getByRole("region", { name: `Video editor for ${fileName}` });
  const video = editor.locator("video");
  await expect(editor).toBeVisible();
  await expect(video).toHaveAttribute("src", /^blob:/);

  const capability = await Promise.race([
    page.waitForFunction(() => {
      const element = document.querySelector('section[aria-label^="Video editor for"] video');
      return element instanceof HTMLVideoElement && Number.isFinite(element.duration) && element.duration > 0;
    }).then(() => "supported" as const),
    editor.getByRole("alert").waitFor({ state: "visible" }).then(() => "unsupported" as const),
  ]);

  if (capability === "unsupported") {
    await expect(editor.getByRole("alert")).toHaveText(
      /This browser does not support the file's video codec or container\. Try a browser-supported MP4 or WebM file\.|The file could not be decoded and may be corrupt or incomplete\. Try a browser-supported MP4 or WebM file\./,
    );
    await expect(editor.getByRole("group", { name: "Video timeline" })).toBeHidden();
    await expect(editor.getByRole("button", { name: "Play selected range" })).toBeHidden();
    await expect(editor.getByRole("button", { name: "Trim selection" })).toBeHidden();
    return false;
  }

  await expect.poll(() => video.evaluate((element) => (element as HTMLVideoElement).duration)).toBeGreaterThan(0);
  await expect(editor.getByRole("slider", { name: "In point" })).toBeVisible();
  await expect(editor.getByRole("slider", { name: "Out point" })).toBeVisible();
  await expect(editor.locator('[aria-live="polite"]')).toHaveText(/\d+:\d\d:\d\d\.\d{3} \/ \d+:\d\d:\d\d\.\d{3}/);
  return true;
}
