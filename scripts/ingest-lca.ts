/**
 * Reduce Department of Labor LCA disclosure spreadsheets to a small summary.
 *
 * Usage: npx tsx scripts/ingest-lca.ts data/raw/LCA_Disclosure_Data_FY2026_Q3.xlsx [more.xlsx...]
 * Output: data/employers.json
 *
 * Keeps certified H-1B filings for software occupations (SOC 15-12xx), then
 * aggregates per employer: total software filings, frontend-titled filings,
 * median annual wage, top worksite states and the most common frontend titles.
 */
import ExcelJS from "exceljs";
import { writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { COMPANIES } from "../src/server/companies";

const FRONTEND = /front[\s-]?end|\bui\b|user interface|react|angular|\bvue\b|javascript|typescript|web (developer|engineer)|design engineer/i;
const SOFTWARE_SOC = /^15-12/;
const MIN_FILINGS = 5;

interface Agg {
  name: string;
  software: number;
  frontend: number;
  wages: number[];
  states: Map<string, number>;
  feTitles: Map<string, number>;
  fiscalYears: Set<string>;
}

const annualize = (amount: number, unit: string): number | null => {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  switch (unit.toLowerCase()) {
    case "year": return amount;
    case "month": return amount * 12;
    case "bi-weekly": return amount * 26;
    case "week": return amount * 52;
    case "hour": return amount * 2080;
    default: return null;
  }
};

const median = (xs: number[]): number | null => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return Math.round(s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2);
};

const top = (m: Map<string, number>, n: number) =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([key, count]) => ({ key, count }));

const cellText = (v: ExcelJS.CellValue): string => {
  if (v == null) return "";
  if (typeof v === "object") {
    if ("text" in v && typeof v.text === "string") return v.text;
    if ("result" in v) return String(v.result ?? "");
    if (v instanceof Date) return v.toISOString();
    if ("richText" in v) return v.richText.map((r) => r.text).join("");
  }
  return String(v);
};

async function ingest(file: string, byEmployer: Map<string, Agg>) {
  const fy = path.basename(file).match(/FY(\d{4})/)?.[1] ?? "unknown";
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(file, { sharedStrings: "cache", worksheets: "emit" });
  let header: string[] = [];
  let rows = 0;
  let kept = 0;
  for await (const sheet of reader) {
    for await (const row of sheet) {
      const values = (row.values as ExcelJS.CellValue[]).slice(1).map(cellText);
      if (!header.length) {
        header = values.map((h) => h.trim().toUpperCase());
        continue;
      }
      rows++;
      const get = (col: string) => values[header.indexOf(col)] ?? "";
      if (!/^CERTIFIED/i.test(get("CASE_STATUS"))) continue;
      if (get("VISA_CLASS") && get("VISA_CLASS") !== "H-1B") continue;
      if (!SOFTWARE_SOC.test(get("SOC_CODE"))) continue;
      const employer = get("EMPLOYER_NAME").trim().toUpperCase().replace(/\s+/g, " ");
      if (!employer) continue;
      kept++;
      let a = byEmployer.get(employer);
      if (!a) {
        a = { name: employer, software: 0, frontend: 0, wages: [], states: new Map(), feTitles: new Map(), fiscalYears: new Set() };
        byEmployer.set(employer, a);
      }
      a.software++;
      a.fiscalYears.add(fy);
      const title = get("JOB_TITLE").trim();
      if (FRONTEND.test(title)) {
        a.frontend++;
        const t = title.toUpperCase();
        a.feTitles.set(t, (a.feTitles.get(t) ?? 0) + 1);
      }
      const wage = annualize(Number(get("WAGE_RATE_OF_PAY_FROM").replace(/[$,]/g, "")), get("WAGE_UNIT_OF_PAY"));
      if (wage && wage < 2_000_000) a.wages.push(wage);
      const st = get("WORKSITE_STATE").trim().toUpperCase();
      if (st) a.states.set(st, (a.states.get(st) ?? 0) + 1);
      if (rows % 100_000 === 0) console.log(`  ${path.basename(file)}: ${rows.toLocaleString()} rows read, ${kept.toLocaleString()} kept`);
    }
    break; // first sheet holds the data
  }
  console.log(`${path.basename(file)}: ${rows.toLocaleString()} rows, ${kept.toLocaleString()} certified H-1B software filings`);
}

async function main() {
  const files = process.argv.slice(2);
  if (!files.length) throw new Error("Pass one or more LCA .xlsx files");
  const byEmployer = new Map<string, Agg>();
  for (const f of files) await ingest(f, byEmployer);

  const employers = [...byEmployer.values()]
    .filter((a) => a.software >= MIN_FILINGS || COMPANIES.some((c) => c.lca.test(a.name)))
    .sort((a, b) => b.software - a.software)
    .map((a) => ({
      name: a.name,
      softwareFilings: a.software,
      frontendFilings: a.frontend,
      medianWage: median(a.wages),
      topStates: top(a.states, 5).map(({ key, count }) => ({ state: key, count })),
      topFrontendTitles: top(a.feTitles, 5).map(({ key, count }) => ({ title: key, count })),
      fiscalYears: [...a.fiscalYears].sort(),
    }));

  mkdirSync("data", { recursive: true });
  writeFileSync("data/employers.json", JSON.stringify({ generatedAt: new Date().toISOString(), sources: files.map((f) => path.basename(f)), employers }));
  console.log(`Wrote data/employers.json with ${employers.length.toLocaleString()} employers (>= ${MIN_FILINGS} software filings)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
