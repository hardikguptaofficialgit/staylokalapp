import { expect, test, type Page } from "@playwright/test";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function upload(page: Page, file: { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator('input[type="file"]').setInputFiles(file);
  await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
}

async function makePdf() {
  const document = await PDFDocument.create();
  const font = await document.embedFont(StandardFonts.Helvetica);
  for (const label of ["First page", "Second page"]) {
    const page = document.addPage([320, 220]);
    page.drawText(label, { x: 40, y: 160, size: 24, font, color: rgb(0, 0, 0) });
  }
  return Buffer.from(await document.save());
}

async function focusHasVisibleOutline(page: Page) {
  return page.evaluate(() => {
    const active = document.activeElement;
    if (!(active instanceof HTMLElement)) return false;
    const style = getComputedStyle(active);
    return style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0;
  });
}

async function expectTouchTargets(page: Page, locator: ReturnType<Page["locator"]>) {
  const sizes = await locator.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }),
  );
  expect(sizes.length).toBeGreaterThan(0);
  for (const size of sizes) {
    expect(size.width, "interactive control is narrower than 44px").toBeGreaterThanOrEqual(44);
    expect(size.height, "interactive control is shorter than 44px").toBeGreaterThanOrEqual(44);
  }
}

test.describe("accessibility and responsive editor workspace", () => {
  test("switches between Smart File and categorized All Tools views", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("group", { name: "Choose tool view" })).toBeVisible();
    await page.getByRole("button", { name: "All Tools" }).click();
    await expect(page.getByRole("heading", { name: "Everything you can do with your files." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Image", exact: true })).toBeVisible();
    await expect(page.getByText("New", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("button", { name: "All Tools" })).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "Smart File" }).click();
    await expect(page.getByRole("button", { name: "Choose files to upload" })).toBeVisible();
  });

  test("keeps desktop, tablet, and mobile workspace full-height and overflow-free", async ({ page }) => {
    for (const [width, dividerVisible] of [[1440, true], [768, false], [390, false]] as const) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      await upload(page, { name: `layout-${width}.png`, mimeType: "image/png", buffer: tinyPng });

      const workspace = page.locator(".uploaded-layout");
      const sidebar = page.locator(".workspace-sidebar");
      const tools = page.locator(".workspace-tools");
      await expect(workspace).toBeVisible();
      await expect(sidebar).toBeVisible();
      await expect(tools).toBeVisible();
      await expect(page.getByRole("separator", { name: "Resize layout" })).toHaveCount(dividerVisible ? 1 : 0);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);

      const geometry = await Promise.all([workspace, sidebar, tools].map((item) => item.boundingBox()));
      expect(geometry[0]?.height).toBeGreaterThanOrEqual(600);
      expect(geometry[1]?.width).toBeLessThan(geometry[2]?.width ?? 0);
      expect((geometry[2]?.width ?? 0) / (geometry[0]?.width ?? 1)).toBeGreaterThan(0.5);
    }
  });

  test("supports keyboard upload, tool selection, back navigation, and visible focus", async ({ page }) => {
    await page.goto("/");
    const dropZone = page.getByRole("button", { name: "Choose files to upload" });
    await dropZone.focus();
    await expect.poll(() => focusHasVisibleOutline(page)).toBe(true);
    await page.keyboard.press("Space");
    await page.locator('input[type="file"]').setInputFiles({ name: "keyboard.png", mimeType: "image/png", buffer: tinyPng });
    await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();

    const cropTool = page.getByRole("button", { name: /Crop image/ });
    await cropTool.focus();
    await expect.poll(() => focusHasVisibleOutline(page)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Image editor" })).toBeVisible();

    const back = page.getByRole("button", { name: "Back to compatible tools" });
    await back.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("heading", { name: "What do you want to do?" })).toBeVisible();
  });

  test("supports keyboard crop handles and keeps image editor controls touch-sized", async ({ page }) => {
    await page.goto("/");
    await upload(page, { name: "crop.png", mimeType: "image/png", buffer: tinyPng });
    await page.getByRole("button", { name: /Crop image/ }).click();
    const editor = page.getByRole("region", { name: "Image editor" });
    const handle = editor.getByRole("button", { name: "Resize crop se" });
    await handle.focus();
    const before = await handle.getAttribute("aria-label");
    await page.keyboard.press("ArrowLeft");
    await expect(handle).toHaveAttribute("aria-label", before ?? "Resize crop se");
    await expectTouchTargets(page, editor.locator("button, select, input"));
    await expect(editor.getByRole("img", { name: "Image preview" })).toHaveAttribute("alt", "Image preview");
  });

  test("supports keyboard PDF page selection, rotation, export, and Escape cancellation", async ({ page }) => {
    await page.goto("/");
    await upload(page, { name: "keyboard.pdf", mimeType: "application/pdf", buffer: await makePdf() });
    await page.getByRole("button", { name: /Rotate PDFs/ }).click();
    const editor = page.getByRole("region", { name: "PDF page editor" });
    await expect(editor).toBeVisible();
    const pageTwo = page.getByRole("button", { name: "Select page 2" });
    await pageTwo.focus();
    await page.keyboard.press("Enter");
    await expect(editor.getByText("Page 2 of 2")).toBeVisible();
    await editor.getByRole("button", { name: "Rotate selected page" }).focus();
    await page.keyboard.press("Space");
    await editor.getByRole("button", { name: "Export PDF" }).focus();
    await expect.poll(() => focusHasVisibleOutline(page)).toBe(true);
    await page.keyboard.press("Enter");
    await expect(page.locator('a[download="rotated-pdf.pdf"]')).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(editor.getByRole("button", { name: "Export PDF" })).toBeVisible();
    await expectTouchTargets(page, editor.locator("button"));
  });

  test("supports audio waveform keyboard and touch range handles", async ({ page }) => {
    await page.goto("/");
    const sampleRate = 8_000;
    const samples = sampleRate;
    const wav = Buffer.alloc(44 + samples * 2);
    wav.write("RIFF", 0);
    wav.writeUInt32LE(36 + samples * 2, 4);
    wav.write("WAVEfmt ", 8);
    wav.writeUInt32LE(16, 16);
    wav.writeUInt16LE(1, 20);
    wav.writeUInt16LE(1, 22);
    wav.writeUInt32LE(sampleRate, 24);
    wav.writeUInt32LE(sampleRate * 2, 28);
    wav.writeUInt16LE(2, 32);
    wav.writeUInt16LE(16, 34);
    wav.write("data", 36);
    wav.writeUInt32LE(samples * 2, 40);
    await upload(page, { name: "keyboard.wav", mimeType: "audio/wav", buffer: wav });
    await page.getByRole("button", { name: /Trim audio/ }).click();
    const editor = page.getByRole("region", { name: /Audio editor/ });
    await expect(editor).toBeVisible();
    const inPoint = editor.getByRole("slider", { name: "In point" });
    const outPoint = editor.getByRole("slider", { name: "Out point" });
    await expect(inPoint).toBeVisible();
    await expect(outPoint).toBeVisible();
    await inPoint.focus();
    const before = Number(await inPoint.getAttribute("aria-valuenow"));
    await page.keyboard.press("ArrowRight");
    await expect.poll(async () => Number(await inPoint.getAttribute("aria-valuenow"))).toBeGreaterThan(before);
    const outBox = await outPoint.boundingBox();
    expect(outBox).not.toBeNull();
    await page.mouse.move((outBox?.x ?? 0) + (outBox?.width ?? 0) / 2, (outBox?.y ?? 0) + (outBox?.height ?? 0) / 2);
    await page.mouse.down();
    await page.mouse.move((outBox?.x ?? 0) + (outBox?.width ?? 0) / 2 - 8, (outBox?.y ?? 0) + (outBox?.height ?? 0) / 2);
    await page.mouse.up();
    await expect(editor.locator('[role="group"][aria-label="Audio waveform timeline"]')).toHaveCSS("touch-action", "none");
    await expectTouchTargets(page, editor.locator("button, [role=slider], input"));
    await editor.getByRole("button", { name: "Play range" }).focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Escape");
  });
});
