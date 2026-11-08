import DataLoader from "dataloader";
import employersFile from "../../data/employers.json";
import jobsFile from "../../data/jobs.json";
import { COMPANIES, type CompanySeed } from "./companies";

export interface EmployerRecord {
  name: string;
  softwareFilings: number;
  frontendFilings: number;
  medianWage: number | null;
  topStates: { state: string; count: number }[];
  topFrontendTitles: { title: string; count: number }[];
  fiscalYears: string[];
}

export interface JobRecord {
  id: string;
  company: string;
  title: string;
  location: string;
  remote: boolean;
  usBased: boolean;
  atlanta: boolean;
  url: string;
  postedAt: string | null;
}

export interface Sponsorship {
  employerNames: string[];
  softwareFilings: number;
  frontendFilings: number;
  medianWage: number | null;
  topStates: { state: string; count: number }[];
  topFrontendTitles: { title: string; count: number }[];
  fiscalYears: string[];
}

export const employers = (employersFile as { employers: EmployerRecord[] }).employers;
export const jobs = (jobsFile as { jobs: JobRecord[] }).jobs;
export const dataMeta = {
  employersGeneratedAt: (employersFile as { generatedAt: string }).generatedAt,
  jobsGeneratedAt: (jobsFile as { generatedAt: string }).generatedAt,
  lcaSources: (employersFile as { sources: string[] }).sources,
};

export const companiesBySlug = new Map(COMPANIES.map((c) => [c.slug, c]));

/** Merge every LCA employer record whose name matches the company's pattern. */
export function sponsorshipFor(company: CompanySeed): Sponsorship | null {
  const matches = employers.filter((e) => company.lca.test(e.name));
  if (!matches.length) return null;
  const merge = (key: "topStates" | "topFrontendTitles", field: "state" | "title") => {
    const m = new Map<string, number>();
    for (const e of matches) for (const row of e[key] as Record<string, string | number>[]) {
      const k = String(row[field]);
      m.set(k, (m.get(k) ?? 0) + Number(row.count));
    }
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([k, count]) => ({ [field]: k, count }));
  };
  const weighted = matches.filter((e) => e.medianWage != null);
  const total = weighted.reduce((s, e) => s + e.softwareFilings, 0);
  return {
    employerNames: matches.map((e) => e.name),
    softwareFilings: matches.reduce((s, e) => s + e.softwareFilings, 0),
    frontendFilings: matches.reduce((s, e) => s + e.frontendFilings, 0),
    // filing-weighted average of each legal entity's median: close enough for a summary
    medianWage: total ? Math.round(weighted.reduce((s, e) => s + (e.medianWage ?? 0) * e.softwareFilings, 0) / total) : null,
    topStates: merge("topStates", "state") as Sponsorship["topStates"],
    topFrontendTitles: merge("topFrontendTitles", "title") as Sponsorship["topFrontendTitles"],
    fiscalYears: [...new Set(matches.flatMap((e) => e.fiscalYears))].sort(),
  };
}

/** Per-request loaders so a list of jobs resolves each company's data once. */
export function createLoaders() {
  return {
    company: new DataLoader<string, CompanySeed | null>(async (slugs) => slugs.map((s) => companiesBySlug.get(s) ?? null)),
    sponsorship: new DataLoader<string, Sponsorship | null>(async (slugs) =>
      slugs.map((s) => {
        const c = companiesBySlug.get(s);
        return c ? sponsorshipFor(c) : null;
      }),
    ),
    openRoles: new DataLoader<string, JobRecord[]>(async (slugs) => slugs.map((s) => jobs.filter((j) => j.company === s))),
  };
}

export type Loaders = ReturnType<typeof createLoaders>;
