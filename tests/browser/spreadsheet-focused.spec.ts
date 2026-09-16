import { expect, test } from "@playwright/test";
import * as XLSX from "xlsx";

test("previews worksheets and exports a selected sheet as CSV", async ({ page }) => {
  test.setTimeout(60_000);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Name", "Score"], ["Ada", 10]]), "Scores");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Status"], ["Ready"]]), "Status");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;

  await page.goto("/");
  await page.locator('input[aria-label="Choose files"]').setInputFiles({
    name: "results.xlsx",
    mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    buffer: Buffer.from(bytes),
  });
  await page.getByRole("button", { name: /Preview spreadsheet/ }).click();
  const editor = page.getByRole("region", { name: "Spreadsheet editor" });
  await expect(editor).toContainText("Ada");
  await editor.getByLabel("Sheet").selectOption("Status");
  await expect(editor).toContainText("Ready");

  await page.getByRole("button", { name: "Back to compatible tools" }).click();
  await page.getByRole("button", { name: /Export CSV/ }).click();
  const csvEditor = page.getByRole("region", { name: "Spreadsheet editor" });
  await csvEditor.getByLabel("Sheet").selectOption("Status");
  await page.getByRole("button", { name: "Export CSV" }).click();
  await expect(page.getByText("Completed Locally")).toBeVisible();
  await expect(page.getByRole("link", { name: /results-Status\.csv/i })).toHaveAttribute("download", "results-Status.csv");
});
