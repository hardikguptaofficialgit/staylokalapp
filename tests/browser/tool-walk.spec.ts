import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";
import { PDFDocument, StandardFonts } from "pdf-lib";
import * as XLSX from "xlsx";

const root = join(tmpdir(), "staylokal-tool-walk");
mkdirSync(root, { recursive: true });

const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVQY02P8z8Dwn4EIwDiqECsDAO0wB0x8l0l2AAAAAElFTkSuQmCC",
  "base64",
);

async function writeFixtures() {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const page = pdf.addPage([320, 420]);
  page.drawText("StayLokal walk fixture", { x: 24, y: 380, size: 14, font });
  page.drawText("Bottom of the page", { x: 24, y: 36, size: 12, font });
  pdf.addPage([320, 420]);
  const pdfPath = join(root, "walk.pdf");
  writeFileSync(pdfPath, Buffer.from(await pdf.save()));
  writeFileSync(join(root, "walk-b.pdf"), Buffer.from(await pdf.save()));
  writeFileSync(join(root, "walk.png"), png);
  writeFileSync(join(root, "walk-b.png"), png);
  writeFileSync(join(root, "walk.txt"), "local notes\nsecond line\n");
  writeFileSync(join(root, "walk.json"), JSON.stringify({ ok: true, n: 1 }));
  const zip = new JSZip();
  zip.file("note.txt", "inside zip");
  writeFileSync(join(root, "walk.zip"), Buffer.from(await zip.generateAsync({ type: "nodebuffer" })));
  const docx = new JSZip();
  docx.file("word/document.xml", "<w:document><w:body><w:p><w:r><w:t>Hello document</w:t></w:r></w:p></w:body></w:document>");
  writeFileSync(join(root, "walk.docx"), Buffer.from(await docx.generateAsync({ type: "nodebuffer" })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Name", "Score"], ["Ada", 10]]), "Scores");
  writeFileSync(join(root, "walk.xlsx"), Buffer.from(XLSX.write(workbook, { bookType: "xlsx", type: "buffer" })));
  return {
    pdfs: [pdfPath, join(root, "walk-b.pdf")],
    images: [join(root, "walk.png"), join(root, "walk-b.png")],
    text: join(root, "walk.txt"),
    json: join(root, "walk.json"),
    zip: join(root, "walk.zip"),
    docx: join(root, "walk.docx"),
    xlsx: join(root, "walk.xlsx"),
  };
}

test("drop a file anywhere and open every compatible tool", async ({ page }) => {
  test.setTimeout(8 * 60_000);
  const files = await writeFixtures();
  const problems: string[] = [];
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));

  await page.goto("/");
  await page.evaluate(async () => {
    const bytes = Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAYAAADED76LAAAAFUlEQVQY02P8z8Dwn4EIwDiqECsDAO0wB0x8l0l2AAAAAElFTkSuQmCC"), (char) => char.charCodeAt(0));
    const file = new File([bytes], "dropped.png", { type: "image/png" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const event = new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer });
    document.body.dispatchEvent(event);
  });
  await expect(page.getByText("dropped.png")).toBeVisible();

  async function clearFiles() {
    const clear = page.getByRole("button", { name: "Clear all" });
    if (await clear.count()) await clear.click();
    await expect(page.getByLabel("Choose files to upload")).toBeVisible();
  }

  async function upload(paths: string[]) {
    await page.locator('input[type="file"][aria-label="Choose files"]').setInputFiles(paths);
    await expect(page.locator(".tool-card").first()).toBeVisible();
  }

  async function walk(label: string, paths: string[]) {
    await upload(paths);
    const names = await page.locator(".tool-card h3").allTextContents();
    expect(names.length, label).toBeGreaterThan(0);
    for (const name of names) {
      await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) }).first().click();
      await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible();
      const alert = page.locator("[role=alert]");
      if (await alert.count()) {
        const text = (await alert.first().innerText()).replace(/\s+/g, " ").trim();
        if (/could not be rendered|Processing Failed|too large/i.test(text)) problems.push(`${label} / ${name}: ${text}`);
      }
      const brokenLayout = await page.locator(".pdf-signature-modal, .pdf-advanced-editor").evaluateAll((nodes) =>
        nodes.some((node) => getComputedStyle(node).position !== "fixed" && node.getBoundingClientRect().width < 280),
      ).catch(() => false);
      if (brokenLayout) problems.push(`${label} / ${name}: tool panel narrower than 280px`);
      await page.getByRole("button", { name: /Back to/ }).click();
      await expect(page.locator(".tool-card").first()).toBeVisible();
    }
    await clearFiles();
  }

  await clearFiles();
  await walk("pdf", files.pdfs);
  await walk("image", files.images);
  await walk("text", [files.text]);
  await walk("json", [files.json]);
  await walk("zip", [files.zip]);
  await walk("docx", [files.docx]);
  await walk("xlsx", [files.xlsx]);

  expect(problems, problems.join("\n")).toEqual([]);
});

test("runs fast tools through to a local download", async ({ page }) => {
  test.setTimeout(4 * 60_000);
  const files = await writeFixtures();

  async function openTool(paths: string[], name: string) {
    await page.goto("/");
    await page.locator('input[type="file"][aria-label="Choose files"]').setInputFiles(paths);
    await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) }).first().click();
    await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible();
  }

  await openTool(files.pdfs.slice(0, 1), "PDF privacy report");
  await page.getByRole("button", { name: "Run tool" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool(files.pdfs.slice(0, 1), "Rotate PDFs");
  await expect(page.getByLabel("PDF page 1 canvas")).toBeVisible();
  await page.getByRole("button", { name: "Export PDF" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool(files.pdfs.slice(0, 1), "Highlight a region");
  await page.getByRole("button", { name: "Run tool" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool(files.images.slice(0, 1), "Resize & compress");
  await page.getByRole("button", { name: "Run Tool" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool([files.text], "Preview text file");
  await page.getByRole("button", { name: "Run Tool" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool([files.json], "Format JSON");
  await page.getByRole("button", { name: "Format JSON" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool([files.json], "File hash");
  await page.getByRole("button", { name: "Compute hash" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool([files.zip], "Inspect ZIP");
  await page.getByRole("button", { name: "Download listing" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool([files.docx], "Extract document text");
  await page.getByRole("button", { name: "Run Tool" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();

  await openTool([files.xlsx], "Preview spreadsheet");
  await page.getByRole("button", { name: "Download preview" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
});

test("opens every audio and video tool", async ({ page }) => {
  test.setTimeout(3 * 60_000);
  const wav = Buffer.alloc(44 + 1600);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(36 + 1600, 4);
  wav.write("WAVE", 8);
  wav.write("fmt ", 12);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(1600, 40);
  const wavPath = join(root, "walk.wav");
  writeFileSync(wavPath, wav);

  async function openAll(paths: string[]) {
    await page.goto("/");
    await page.locator('input[type="file"][aria-label="Choose files"]').setInputFiles(paths);
    await expect(page.locator(".tool-card").first()).toBeVisible();
    const names = await page.locator(".tool-card h3").allTextContents();
    expect(names.length).toBeGreaterThan(0);
    for (const name of names) {
      await page.locator(".tool-card").filter({ has: page.getByRole("heading", { name, exact: true }) }).first().click();
      await expect(page.getByRole("heading", { name, exact: true }).first()).toBeVisible();
      await expect(page.getByText("This PDF could not be rendered locally.")).toHaveCount(0);
      await page.getByRole("button", { name: /Back to/ }).click();
    }
  }

  await openAll([wavPath]);
  await openAll([join(process.cwd(), "tests/browser/fixtures/static-video.mp4")]);
});
