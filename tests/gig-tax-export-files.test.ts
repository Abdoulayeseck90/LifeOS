import { describe, it, expect } from "vitest";
import { buildIncomeCsv, buildMileageCsv, buildExpensesCsv, buildTaxCsvBundle, buildTaxWorkbookXlsx, buildTaxSummaryPdf, buildTaxPackageZip } from "@/lib/work/gig-tax-export-files";
import type { GigTaxExportData } from "@/lib/work/gig-tax-export";

// Smoke tests only -- these builders wrap binary/streaming libraries
// (archiver/exceljs/pdfkit); deep binary-format assertions aren't worth
// it, but every builder should produce well-formed, non-empty output and
// the ZIP package should include every receipt exactly once.

function sampleData(overrides: Partial<GigTaxExportData> = {}): GigTaxExportData {
  return {
    taxYear: 2026,
    filters: { vehicleId: null, vehicleName: null, platforms: null },
    income: { byPlatform: { doordash: 100 }, total: 100 },
    mileage: {
      totalMiles: 88,
      byPlatform: { doordash: 88 },
      byVehicle: [{ vehicleId: "vehicle-1", vehicleName: "2020 Toyota Camry", miles: 88 }],
      byMonth: [{ month: "2026-09", miles: 88 }],
      odometerRecords: [{ shiftId: "shift-1", date: "2026-09-05", vehicleName: "2020 Toyota Camry", startOdometer: 1000, endOdometer: 1088, miles: 88 }],
    },
    expenses: {
      byCategory: { fuel: 18 },
      total: 18,
      records: [{ id: "expense-1", date: "2026-09-05", category: "fuel", amount: 18, description: null, vehicleName: "2020 Toyota Camry", hasReceipt: true }],
    },
    maintenanceLog: [],
    receiptIndex: [
      { documentId: "doc-1", documentName: "receipt.pdf", storagePath: "user-1/doc-1/receipt.pdf", relatedType: "expense", category: "fuel", amount: 18, date: "2026-09-05" },
    ],
    summary: {
      incomeByPlatform: { doordash: 100 },
      totalIncome: 100,
      businessMiles: 88,
      recordedExpenses: 18,
      mileageRate: 0.67,
      estimatedMileageDeduction: 88 * 0.67,
      estimatedNetProfit: 100 - 18 - 88 * 0.67,
    },
    ...overrides,
  };
}

describe("CSV builders", () => {
  it("produces well-formed CSV with a header row and no unescaped commas", () => {
    const csv = buildIncomeCsv(sampleData());
    const lines = csv.trim().split("\r\n");
    expect(lines[0]).toBe("Platform,Income");
    expect(lines.some((l) => l.startsWith("Total,"))).toBe(true);
  });

  it("escapes fields containing commas or quotes", () => {
    const data = sampleData();
    data.expenses.records[0]!.description = 'Toll, "express" lane';
    const csv = buildExpensesCsv(data);
    expect(csv).toContain('"Toll, ""express"" lane"');
  });

  it("mileage CSV includes odometer records, by-vehicle, and by-month sections", () => {
    const csv = buildMileageCsv(sampleData());
    expect(csv).toContain("Odometer Records");
    expect(csv).toContain("By Vehicle");
    expect(csv).toContain("By Month");
    expect(csv).toContain("Total Business Miles,88");
  });
});

describe("buildTaxCsvBundle", () => {
  it("returns a non-empty ZIP buffer", async () => {
    const buffer = await buildTaxCsvBundle(sampleData());
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});

describe("buildTaxWorkbookXlsx", () => {
  it("returns a non-empty xlsx buffer (zip-based format)", async () => {
    const buffer = await buildTaxWorkbookXlsx(sampleData());
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
  });
});

describe("buildTaxSummaryPdf", () => {
  it("returns a non-empty PDF buffer with a valid PDF header", async () => {
    const buffer = await buildTaxSummaryPdf(sampleData());
    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 4).toString("ascii")).toBe("%PDF");
  });
});

describe("buildTaxPackageZip", () => {
  it("bundles the PDF, workbook, CSVs, and every receipt exactly once", async () => {
    const downloaded: string[] = [];
    const buffer = await buildTaxPackageZip(sampleData(), async (path) => {
      downloaded.push(path);
      return Buffer.from("fake-receipt-bytes");
    });

    expect(buffer.length).toBeGreaterThan(0);
    expect(buffer.subarray(0, 2).toString("ascii")).toBe("PK");
    expect(downloaded).toEqual(["user-1/doc-1/receipt.pdf"]);
  });

  it("doesn't fail the whole package if a single receipt download fails", async () => {
    const buffer = await buildTaxPackageZip(sampleData(), async () => {
      throw new Error("storage unavailable");
    });
    expect(buffer.length).toBeGreaterThan(0);
  });
});
