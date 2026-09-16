import { expect, test } from "@playwright/test";
import { PDFDocument } from "pdf-lib";

test("fills supported local PDF form controls", async ({ page }) => {
  const document = await PDFDocument.create();
  const form = document.getForm();
  const name = form.createTextField("Full name");
  name.addToPage(document.addPage([420, 240]), { x: 32, y: 160, width: 200, height: 24 });
  const date = form.createTextField("Date");
  date.addToPage(document.getPage(0), { x: 32, y: 115, width: 200, height: 24 });
  const checkbox = form.createCheckBox("Agree");
  checkbox.addToPage(document.getPage(0), { x: 32, y: 70, width: 18, height: 18 });
  const choice = form.createDropdown("Department");
  choice.addOptions(["Engineering", "Design"]);
  choice.addToPage(document.getPage(0), { x: 32, y: 25, width: 200, height: 24 });
  const pdf = Buffer.from(await document.save());

  await page.goto("/");
  await page.locator('input[type="file"]').first().setInputFiles({ name: "form.pdf", mimeType: "application/pdf", buffer: pdf });
  await page.getByRole("button", { name: /Fill PDF form/ }).click();

  const editor = page.getByRole("region", { name: "Fill PDF form" });
  await editor.getByLabel("Full name").fill("Ada Lovelace");
  await editor.getByLabel("Date").fill("1843-12-10");
  await editor.getByLabel("Agree").check();
  await editor.getByLabel("Department").selectOption({ label: "Engineering" });
  await editor.getByRole("button", { name: /Save filled form/ }).click();

  await expect(page.getByText("Completed Locally")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByRole("link", { name: "filled-form.pdf" })).toBeVisible();
});
