import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";
import { ZipArchive } from "archiver";
import type { GigTaxExportData } from "@/lib/work/gig-tax-export";

// File generation for the Tax Filing Export. Server-only (Node Buffers /
// pdfkit / exceljs / archiver -- none of this runs in the browser).
// Generated document content is deliberately English-only regardless of
// the app's UI language (confirmed with the user): tax documents commonly
// go to a preparer or the IRS in English. Every calculated/estimated
// figure is labeled "(estimate)" -- nothing here is presented as a filed
// or definitive tax figure.

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer) => chunks.push(chunk));
    stream.on("end", () => resolve(Buffer.concat(chunks)));
    stream.on("error", reject);
  });
}

function money(n: number): string {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
}

function csvField(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(csvField).join(","), ...rows.map((row) => row.map(csvField).join(","))];
  return lines.join("\r\n") + "\r\n";
}

// ---- Per-section table builders (shared by CSV + Excel) ----

function incomeTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  const rows = Object.entries(data.income.byPlatform).map(([platform, total]) => [platform, total]);
  rows.push(["Total", data.income.total]);
  return { headers: ["Platform", "Income"], rows };
}

function mileageOdometerTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  return {
    headers: ["Date", "Vehicle", "Start Odometer", "End Odometer", "Miles"],
    rows: data.mileage.odometerRecords.map((r) => [r.date, r.vehicleName ?? "Unassigned", r.startOdometer, r.endOdometer ?? "", r.miles ?? ""]),
  };
}

function mileageByVehicleTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  return { headers: ["Vehicle", "Miles"], rows: data.mileage.byVehicle.map((v) => [v.vehicleName, v.miles]) };
}

function mileageByMonthTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  return { headers: ["Month", "Miles"], rows: data.mileage.byMonth.map((m) => [m.month, m.miles]) };
}

function expensesTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  return {
    headers: ["Date", "Category", "Amount", "Description", "Vehicle", "Has Receipt"],
    rows: data.expenses.records.map((e) => [e.date, e.category, e.amount, e.description ?? "", e.vehicleName ?? "", e.hasReceipt ? "Yes" : "No"]),
  };
}

function expensesByCategoryTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  const rows = Object.entries(data.expenses.byCategory).map(([category, total]) => [category, total]);
  rows.push(["Total", data.expenses.total]);
  return { headers: ["Category", "Amount"], rows };
}

function platformBreakdownTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  const platforms = new Set([...Object.keys(data.income.byPlatform), ...Object.keys(data.mileage.byPlatform)]);
  return {
    headers: ["Platform", "Income", "Miles"],
    rows: Array.from(platforms).map((platform) => [platform, data.income.byPlatform[platform] ?? 0, data.mileage.byPlatform[platform] ?? 0]),
  };
}

function maintenanceLogTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  return {
    headers: ["Date", "Vehicle", "Type", "Mileage", "Cost", "Has Receipt"],
    rows: data.maintenanceLog.map((m) => [m.date, m.vehicleName, m.type, m.mileage ?? "", m.cost ?? "", m.hasReceipt ? "Yes" : "No"]),
  };
}

function receiptIndexTable(data: GigTaxExportData): { headers: string[]; rows: (string | number)[][] } {
  return {
    headers: ["Document", "Related To", "Category", "Amount", "Date"],
    rows: data.receiptIndex.map((r) => [r.documentName, r.relatedType, r.category, r.amount ?? "", r.date ?? ""]),
  };
}

function summaryRows(data: GigTaxExportData): (string | number)[][] {
  const s = data.summary;
  return [
    ["Tax Year", data.taxYear],
    ["Vehicle Filter", data.filters.vehicleName ?? "All vehicles"],
    ["Platform Filter", data.filters.platforms?.join(", ") ?? "All platforms"],
    ["Total Income", s.totalIncome],
    ["Business Miles", s.businessMiles],
    ["Recorded Expenses", s.recordedExpenses],
    ["Mileage Rate", s.mileageRate ?? "Not set"],
    ["Estimated Mileage Deduction (estimate)", s.estimatedMileageDeduction ?? "Not set -- no mileage rate configured for this year"],
    ["Estimated Net Business Income (estimate)", s.estimatedNetProfit],
  ];
}

// ---- CSV builders ----

export function buildIncomeCsv(data: GigTaxExportData): string {
  const t = incomeTable(data);
  return toCsv(t.headers, t.rows);
}

export function buildMileageCsv(data: GigTaxExportData): string {
  const odometer = mileageOdometerTable(data);
  const byVehicle = mileageByVehicleTable(data);
  const byMonth = mileageByMonthTable(data);
  return [
    "Odometer Records",
    toCsv(odometer.headers, odometer.rows),
    "",
    "By Vehicle",
    toCsv(byVehicle.headers, byVehicle.rows),
    "",
    "By Month",
    toCsv(byMonth.headers, byMonth.rows),
    "",
    "Total Business Miles," + data.mileage.totalMiles,
  ].join("\r\n");
}

export function buildExpensesCsv(data: GigTaxExportData): string {
  const records = expensesTable(data);
  const byCategory = expensesByCategoryTable(data);
  return [records.headers.join(","), ...records.rows.map((r) => r.map(csvField).join(",")), "", "By Category", toCsv(byCategory.headers, byCategory.rows)].join("\r\n");
}

export function buildPlatformBreakdownCsv(data: GigTaxExportData): string {
  const t = platformBreakdownTable(data);
  return toCsv(t.headers, t.rows);
}

export function buildSummaryCsv(data: GigTaxExportData): string {
  return toCsv(["Field", "Value"], summaryRows(data));
}

export function buildReceiptIndexCsv(data: GigTaxExportData): string {
  const t = receiptIndexTable(data);
  return toCsv(t.headers, t.rows);
}

// ---- CSV bundle (Export CSV button) ----

export async function buildTaxCsvBundle(data: GigTaxExportData): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const bufferPromise = streamToBuffer(archive);

  archive.append(buildSummaryCsv(data), { name: "Tax-Year-Summary.csv" });
  archive.append(buildIncomeCsv(data), { name: "Income.csv" });
  archive.append(buildMileageCsv(data), { name: "Mileage.csv" });
  archive.append(buildExpensesCsv(data), { name: "Expenses.csv" });
  archive.append(buildPlatformBreakdownCsv(data), { name: "Platform-Breakdown.csv" });
  await archive.finalize();

  return bufferPromise;
}

// ---- Excel workbook (Export Excel button) ----

export async function buildTaxWorkbookXlsx(data: GigTaxExportData): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "LifeOS";
  workbook.created = new Date();

  function addSheet(name: string, headers: string[], rows: (string | number)[][]) {
    const sheet = workbook.addWorksheet(name);
    sheet.columns = headers.map((header) => ({ header, key: header, width: Math.max(14, header.length + 2) }));
    sheet.getRow(1).font = { bold: true };
    for (const row of rows) sheet.addRow(row);
  }

  addSheet("Summary", ["Field", "Value"], summaryRows(data));
  addSheet("Income", incomeTable(data).headers, incomeTable(data).rows);

  const mileageSheet = workbook.addWorksheet("Mileage");
  mileageSheet.addRow(["Odometer Records"]).font = { bold: true };
  mileageSheet.addRow(mileageOdometerTable(data).headers).font = { bold: true };
  for (const row of mileageOdometerTable(data).rows) mileageSheet.addRow(row);
  mileageSheet.addRow([]);
  mileageSheet.addRow(["By Vehicle"]).font = { bold: true };
  mileageSheet.addRow(mileageByVehicleTable(data).headers).font = { bold: true };
  for (const row of mileageByVehicleTable(data).rows) mileageSheet.addRow(row);
  mileageSheet.addRow([]);
  mileageSheet.addRow(["By Month"]).font = { bold: true };
  mileageSheet.addRow(mileageByMonthTable(data).headers).font = { bold: true };
  for (const row of mileageByMonthTable(data).rows) mileageSheet.addRow(row);
  mileageSheet.addRow([]);
  mileageSheet.addRow(["Total Business Miles", data.mileage.totalMiles]);
  mileageSheet.columns.forEach((col) => (col.width = 18));

  addSheet("Expenses", expensesTable(data).headers, expensesTable(data).rows);
  addSheet("Platform Breakdown", platformBreakdownTable(data).headers, platformBreakdownTable(data).rows);
  addSheet("Maintenance Log", maintenanceLogTable(data).headers, maintenanceLogTable(data).rows);
  addSheet("Receipt Index", receiptIndexTable(data).headers, receiptIndexTable(data).rows);

  const arrayBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(arrayBuffer);
}

// ---- PDF summary (Export PDF button + inside the ZIP package) ----

export async function buildTaxSummaryPdf(data: GigTaxExportData): Promise<Buffer> {
  const doc = new PDFDocument({ margin: 50 });
  const bufferPromise = streamToBuffer(doc);

  doc.fontSize(18).text(`LifeOS Gig Driving — Tax Year ${data.taxYear} Summary`, { align: "left" });
  doc.fontSize(9).fillColor("#666666").text(`Generated ${new Date().toLocaleString("en-US")}`);
  const filterLine = `Vehicle: ${data.filters.vehicleName ?? "All vehicles"}   Platforms: ${data.filters.platforms?.join(", ") ?? "All platforms"}`;
  doc.text(filterLine).fillColor("#000000").moveDown();

  function section(title: string) {
    doc.moveDown(0.5).fontSize(13).text(title, { underline: true }).fontSize(10).moveDown(0.3);
  }

  function line(label: string, value: string) {
    doc.text(`${label}: ${value}`);
  }

  section("Income");
  for (const [platform, total] of Object.entries(data.income.byPlatform)) line(platform, money(total));
  line("Total Income", money(data.income.total));

  section("Mileage");
  line("Total Business Miles", `${data.mileage.totalMiles.toLocaleString()} mi`);
  for (const v of data.mileage.byVehicle) line(v.vehicleName, `${v.miles.toLocaleString()} mi`);

  section("Expenses");
  for (const [category, total] of Object.entries(data.expenses.byCategory)) line(category, money(total));
  line("Total Recorded Expenses", money(data.expenses.total));

  section("Tax Summary (estimate where noted)");
  line("Total Income", money(data.summary.totalIncome));
  line("Recorded Expenses", money(data.summary.recordedExpenses));
  line("Business Miles", `${data.summary.businessMiles.toLocaleString()} mi`);
  line("Mileage Rate", data.summary.mileageRate !== null ? `$${data.summary.mileageRate}/mi` : "Not set for this tax year");
  line(
    "Estimated Mileage Deduction (estimate)",
    data.summary.estimatedMileageDeduction !== null ? money(data.summary.estimatedMileageDeduction) : "Not available -- no mileage rate configured"
  );
  line("Estimated Net Business Income (estimate)", money(data.summary.estimatedNetProfit));

  doc
    .moveDown(1)
    .fontSize(8)
    .fillColor("#666666")
    .text(
      "LifeOS is a personal recordkeeping tool, not a substitute for a tax professional. Figures labeled \"estimate\" are calculated from your recorded data and the mileage rate you configured -- verify all figures before filing.",
      { align: "left" }
    );

  doc.end();
  return bufferPromise;
}

// ---- Full ZIP package (Download Tax Package button) ----

export async function buildTaxPackageZip(data: GigTaxExportData, downloadReceipt: (storagePath: string) => Promise<Buffer>): Promise<Buffer> {
  const archive = new ZipArchive({ zlib: { level: 9 } });
  const bufferPromise = streamToBuffer(archive);
  const folder = `${data.taxYear}-Gig-Tax-Package`;

  const [pdf, xlsx] = await Promise.all([buildTaxSummaryPdf(data), buildTaxWorkbookXlsx(data)]);

  archive.append(pdf, { name: `${folder}/Tax-Summary.pdf` });
  archive.append(xlsx, { name: `${folder}/Tax-Records.xlsx` });
  archive.append(buildIncomeCsv(data), { name: `${folder}/Income.csv` });
  archive.append(buildMileageCsv(data), { name: `${folder}/Mileage.csv` });
  archive.append(buildExpensesCsv(data), { name: `${folder}/Expenses.csv` });
  archive.append(buildReceiptIndexCsv(data), { name: `${folder}/Receipt-Index.csv` });

  const usedNames = new Set<string>();
  // De-duplicated by document id in case the same receipt is somehow
  // indexed twice (e.g. attached to both an expense and its maintenance
  // record) -- each file should only be written into Receipts/ once.
  const seenDocumentIds = new Set<string>();
  for (const receipt of data.receiptIndex) {
    if (seenDocumentIds.has(receipt.documentId)) continue;
    seenDocumentIds.add(receipt.documentId);
    try {
      const bytes = await downloadReceipt(receipt.storagePath);
      let name = receipt.documentName;
      let counter = 2;
      while (usedNames.has(name)) {
        const dot = receipt.documentName.lastIndexOf(".");
        name = dot === -1 ? `${receipt.documentName}-${counter}` : `${receipt.documentName.slice(0, dot)}-${counter}${receipt.documentName.slice(dot)}`;
        counter += 1;
      }
      usedNames.add(name);
      archive.append(bytes, { name: `${folder}/Receipts/${name}` });
    } catch {
      // A single unreadable/missing receipt shouldn't fail the whole
      // package -- it's still listed in Receipt-Index.csv either way.
    }
  }

  await archive.finalize();
  return bufferPromise;
}
