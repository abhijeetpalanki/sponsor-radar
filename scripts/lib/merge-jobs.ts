export interface Job {
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

/** If more than this share of boards fail, the run is treated as a network problem and nothing is written. */
export const MAX_FAILURE_SHARE = 0.25;

export interface MergeResult {
  jobs: Job[];
  /** Companies whose board failed this run and kept yesterday's roles instead. */
  carriedOver: string[];
  changed: boolean;
}

const byCompanyThenId = (a: Job, b: Job) => a.company.localeCompare(b.company) || a.id.localeCompare(b.id);

/**
 * Combine a fresh fetch with the previous file.
 *
 * A board that failed this run keeps its previous roles, so one flaky API does not
 * empty a company's listings overnight. Output is sorted so the committed JSON only
 * changes when a role really changes, which keeps the nightly commit (and the
 * Netlify build it triggers) to days when there is something new.
 */
export function mergeJobs(previous: Job[], fresh: Map<string, Job[]>, failed: string[]): MergeResult {
  const failedSet = new Set(failed);
  const carried = previous.filter((j) => failedSet.has(j.company));
  const jobs = [...[...fresh.values()].flat(), ...carried].sort(byCompanyThenId);
  const before = [...previous].sort(byCompanyThenId);
  return {
    jobs,
    carriedOver: failed.filter((slug) => carried.some((j) => j.company === slug)),
    changed: JSON.stringify(jobs) !== JSON.stringify(before),
  };
}

/** True when too many boards failed for the result to be trusted. */
export function tooManyFailures(failed: number, total: number): boolean {
  return total > 0 && failed / total > MAX_FAILURE_SHARE;
}
