import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import spreadsheetProcessor, { readSpreadsheet } from "../lib/tools/spreadsheet";

function workbookFile() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Name", "Score"], ["Ada", 10]]), "Scores");
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Status"], ["Ready"]]), "Status");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" }) as ArrayBuffer;
  return new File([bytes], "results.xlsx");
}

const context = { onProgress: () => undefined, signal: new AbortController().signal };

describe("spreadsheet processor", () => {
  it("reads sheets and cell values locally", async () => {
    const workbook = await readSpreadsheet(workbookFile(), context.signal);
    expect(workbook.sheets.map((sheet) => sheet.name)).toEqual(["Scores", "Status"]);
    expect(workbook.sheets[0].rows[1]).toEqual(["Ada", "10"]);
  });

  it("exports the selected worksheet as CSV", async () => {
    const [result] = await spreadsheetProcessor([workbookFile()], { operation: "spreadsheet-csv", sheet: "Status" }, context);
    await expect(result.blob.text()).resolves.toContain("Status\nReady");
    expect(result.name).toBe("results-Status.csv");
  });

  it("rejects malformed spreadsheets", async () => {
    await expect(spreadsheetProcessor([new File([], "broken.xlsx")], { operation: "spreadsheet-csv" }, context))
      .rejects.toMatchObject({ code: "invalid" });
  });

  it("honors cancellation", async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(readSpreadsheet(workbookFile(), controller.signal)).rejects.toMatchObject({ code: "cancelled" });
  });
});
