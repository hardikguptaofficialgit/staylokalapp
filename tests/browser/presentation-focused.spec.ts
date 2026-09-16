import { expect, test } from "@playwright/test";
import JSZip from "jszip";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("extracts PPTX slide text locally", async ({ page }) => {
  test.setTimeout(60_000);
  const zip = new JSZip();
  zip.file("ppt/slides/slide1.xml", '<p:sld xmlns:a="a" xmlns:p="p"><a:t>First slide</a:t></p:sld>');
  zip.file("ppt/slides/slide2.xml", '<p:sld xmlns:a="a" xmlns:p="p"><a:t>Second slide</a:t></p:sld>');
  const buffer = Buffer.from(await zip.generateAsync({ type: "uint8array" }));

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "sample.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer,
  });
  await page.getByRole("button", { name: /Extract PPTX text/ }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  const result = page.getByRole("link", { name: /sample-text\.txt/i });
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("download", "sample-text.txt");
});

test("extracts legacy PPT text locally", async ({ page }) => {
  test.setTimeout(60_000);
  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "layout_types_2011.ppt",
    mimeType: "application/vnd.ms-powerpoint",
    buffer: readFileSync(resolve(process.cwd(), "tests/fixtures/layout_types_2011.ppt")),
  });
  await page.getByRole("button", { name: /Extract PPT text/ }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  const result = page.getByRole("link", { name: /layout_types_2011-text\.txt/i });
  await expect(result).toBeVisible();
  await expect(result).toHaveAttribute("download", "layout_types_2011-text.txt");
});

test("converts a real PPTX to PDF and slide images locally", async ({ page }) => {
  test.setTimeout(120_000);
  const buffer = readFileSync(resolve(process.cwd(), "tests/fixtures/sample.pptx"));

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "sample.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer,
  });
  await page.getByRole("button", { name: "PPTX → PDF" }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("link", { name: /sample\.pdf/i })).toHaveAttribute("download", "sample.pdf");

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "sample.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer,
  });
  await page.getByRole("button", { name: "PPTX → PNG" }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("link", { name: /sample-slide-01\.png/i })).toHaveAttribute("download", "sample-slide-01.png");

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "sample.pptx",
    mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    buffer,
  });
  await page.getByRole("button", { name: "PPTX → JPG" }).click();
  await page.getByRole("button", { name: /Run Tool/ }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 90_000 });
  await expect(page.getByRole("link", { name: /sample-slide-01\.jpg/i })).toHaveAttribute("download", "sample-slide-01.jpg");
});
