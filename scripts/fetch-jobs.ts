/**
 * Pull open roles from public job-board APIs (Greenhouse, Ashby, Lever) for the
 * tracked companies and keep frontend / fullstack engineering roles.
 *
 * Usage: npm run data:jobs
 * Output: data/jobs.json (only rewritten when a role changed)
 * Exit 1 when too many boards fail, so the nightly workflow commits nothing.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { COMPANIES, type CompanySeed } from "../src/server/companies";
import { mergeJobs, tooManyFailures, type Job } from "./lib/merge-jobs";

const ROLE = /front[\s-]?end|full[\s-]?stack|\bui\b|web (engineer|developer)|react|design engineer|product engineer/i;
const NOT_ROLE = /manager|director|recruit|designer(?! engineer)|intern\b|sales|marketing|account/i;

const US = /united states|\bUSA?\b|remote[-,\s]*(us|usa|united states)|\b(AL|AK|AZ|AR|CA|CO|CT|DE|FL|GA|HI|ID|IL|IN|IA|KS|KY|LA|ME|MD|MA|MI|MN|MS|MO|MT|NE|NV|NH|NJ|NM|NY|NC|ND|OH|OK|OR|PA|RI|SC|SD|TN|TX|UT|VT|VA|WA|WV|WI|WY)\b|new york|san francisco|seattle|atlanta|austin|boston|chicago|denver|los angeles|bay area/i;
const NON_US = /canada|toronto|vancouver|london|uk\b|united kingdom|ireland|dublin|germany|berlin|india|bangalore|bengaluru|singapore|australia|sydney|japan|tokyo|brazil|mexico|poland|netherlands|amsterdam|spain|france|paris|israel|emea|apac|latam/i;

const classify = (location: string, remoteFlag = false) => {
  const remote = remoteFlag || /remote/i.test(location);
  const usBased = US.test(location) && !(NON_US.test(location) && !/united states|\bUS\b/i.test(location));
  return { remote, usBased: usBased || (remote && !NON_US.test(location) && /remote$/i.test(location.trim())), atlanta: /atlanta|\bGA\b|georgia/i.test(location) };
};

async function getJson(url: string) {
  const res = await fetch(url, { headers: { "user-agent": "sponsor-radar (public job board reader)" } });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchCompany(c: CompanySeed): Promise<Job[]> {
  if (c.ats === "greenhouse") {
    const d = await getJson(`https://boards-api.greenhouse.io/v1/boards/${c.board}/jobs`);
    return d.jobs.map((j: { id: number; title: string; location?: { name?: string }; absolute_url: string; updated_at?: string; first_published?: string }) => {
      const location = j.location?.name ?? "";
      return { id: `gh-${j.id}`, company: c.slug, title: j.title, location, ...classify(location), url: j.absolute_url, postedAt: j.first_published ?? j.updated_at ?? null };
    });
  }
  if (c.ats === "ashby") {
    const d = await getJson(`https://api.ashbyhq.com/posting-api/job-board/${c.board}`);
    return d.jobs.map((j: { id: string; title: string; location?: string; isRemote?: boolean; jobUrl: string; publishedAt?: string; address?: { postalAddress?: { addressCountry?: string } } }) => {
      const location = [j.location, j.address?.postalAddress?.addressCountry].filter(Boolean).join(", ");
      return { id: `ab-${j.id}`, company: c.slug, title: j.title, location, ...classify(location, j.isRemote), url: j.jobUrl, postedAt: j.publishedAt ?? null };
    });
  }
  const d = await getJson(`https://api.lever.co/v0/postings/${c.board}?mode=json`);
  return d.map((j: { id: string; text: string; categories?: { location?: string; allLocations?: string[] }; workplaceType?: string; hostedUrl: string; createdAt?: number }) => {
    const location = j.categories?.allLocations?.join(" / ") || j.categories?.location || "";
    return { id: `lv-${j.id}`, company: c.slug, title: j.text, location, ...classify(location, j.workplaceType === "remote"), url: j.hostedUrl, postedAt: j.createdAt ? new Date(j.createdAt).toISOString() : null };
  });
}

function readPrevious(): Job[] {
  if (!existsSync("data/jobs.json")) return [];
  return (JSON.parse(readFileSync("data/jobs.json", "utf8")) as { jobs: Job[] }).jobs;
}

async function main() {
  const fresh = new Map<string, Job[]>();
  const failures: { slug: string; message: string }[] = [];
  for (const c of COMPANIES) {
    try {
      const all = await fetchCompany(c);
      const kept = all.filter((j) => ROLE.test(j.title) && !NOT_ROLE.test(j.title));
      fresh.set(c.slug, kept);
      console.log(`${c.name.padEnd(14)} ${String(all.length).padStart(4)} open, ${kept.length} frontend/fullstack`);
    } catch (e) {
      failures.push({ slug: c.slug, message: (e as Error).message });
    }
  }
  if (failures.length) console.log("Failed:", failures.map((f) => `${f.slug}: ${f.message}`).join("; "));

  if (tooManyFailures(failures.length, COMPANIES.length)) {
    console.error(`\n${failures.length} of ${COMPANIES.length} boards failed. Not writing data/jobs.json.`);
    process.exit(1);
  }

  const { jobs, carriedOver, changed } = mergeJobs(readPrevious(), fresh, failures.map((f) => f.slug));
  if (carriedOver.length) console.log(`Kept previous roles for: ${carriedOver.join(", ")}`);
  if (!changed) {
    console.log(`\nNo role changes (${jobs.length} roles). data/jobs.json left as is.`);
    return;
  }
  mkdirSync("data", { recursive: true });
  writeFileSync("data/jobs.json", JSON.stringify({ generatedAt: new Date().toISOString(), jobs }));
  console.log(`\nWrote data/jobs.json: ${jobs.length} roles (${jobs.filter((j) => j.usBased).length} US, ${jobs.filter((j) => j.remote && j.usBased).length} US-remote, ${jobs.filter((j) => j.atlanta).length} Atlanta)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
