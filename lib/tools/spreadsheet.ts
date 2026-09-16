import * as XLSX from "xlsx";
import { ProcessingError, type ProcessedFile, type ToolProcessor } from "./types";

export type SpreadsheetSheet = {
  name: string;
  rows: string[][];
  csv: string;
};

export type SpreadsheetWorkbook = {
  sheets: SpreadsheetSheet[];
};

function checkCancelled(signal: AbortSignal) {
  if (signal.aborted) throw new ProcessingError("Processing cancelled.", "cancelled");
}

export async function readSpreadsheet(
  file: File,
  signal: AbortSignal,
  onProgress: (ratio: number) => void = () => undefined,
): Promise<SpreadsheetWorkbook> {
  checkCancelled(signal);
  if (file.size === 0) throw new ProcessingError("Empty spreadsheets cannot be processed.", "invalid");
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  } catch {
    throw new ProcessingError("This spreadsheet could not be opened locally.", "invalid");
  }

  if (!workbook.SheetNames.length) throw new ProcessingError("No worksheets were found in this spreadsheet.", "invalid");
  const sheets: SpreadsheetSheet[] = [];
  for (const [index, name] of workbook.SheetNames.entries()) {
    checkCancelled(signal);
    const sheet = workbook.Sheets[name];
    if (!sheet) continue;
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: "" })
      .map((row) => row.map((cell) => String(cell)));
    sheets.push({ name, rows, csv: XLSX.utils.sheet_to_csv(sheet) });
    onProgress((index + 1) / workbook.SheetNames.length);
  }
  return { sheets };
}

const spreadsheetProcessor: ToolProcessor = async (files, options, context) => {
  const outputs: ProcessedFile[] = [];
  for (const [index, file] of files.entries()) {
    const workbook = await readSpreadsheet(file, context.signal, (ratio) => {
      context.onProgress({
        ratio: (index + ratio) / files.length,
        label: `Reading ${file.name}`,
      });
    });
    const selectedName = typeof options.sheet === "string" && options.sheet
      ? options.sheet
      : workbook.sheets[0]?.name;
    const selected = workbook.sheets.find((sheet) => sheet.name === selectedName) ?? workbook.sheets[0];
    if (!selected) throw new ProcessingError("No worksheet could be selected.", "invalid");
    outputs.push({
      blob: new Blob([selected.csv], { type: "text/csv;charset=utf-8" }),
      type: "text/csv",
      name: `${file.name.replace(/\.(xlsx|xls)$/i, "")}-${selected.name}.csv`,
    });
  }
  return outputs;
};

export default spreadsheetProcessor;
