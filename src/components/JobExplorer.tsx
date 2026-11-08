"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { gql } from "@/lib/gql";
import { ago, num, usd } from "@/lib/format";

interface JobNode {
  id: string;
  title: string;
  location: string;
  remote: boolean;
  atlanta: boolean;
  url: string;
  postedAt: string | null;
  company: { slug: string; name: string; sponsorship: { softwareFilings: number; medianWage: number | null } | null };
}

interface JobsResult {
  jobs: { totalCount: number; edges: { cursor: string; node: JobNode }[]; pageInfo: { hasNextPage: boolean; endCursor: string | null } };
}

const JOBS_QUERY = /* GraphQL */ `
  query Jobs($filter: JobFilter, $after: String) {
    jobs(filter: $filter, first: 20, after: $after) {
      totalCount
      edges { cursor node { id title location remote atlanta url postedAt company { slug name sponsorship { softwareFilings medianWage } } } }
      pageInfo { hasNextPage endCursor }
    }
  }
`;

type Where = "us-remote" | "atlanta" | "us" | "any";
const WHERE: { value: Where; label: string }[] = [
  { value: "us-remote", label: "US remote" },
  { value: "atlanta", label: "Atlanta" },
  { value: "us", label: "Anywhere in the US" },
  { value: "any", label: "Any location" },
];
const SPONSOR = [
  { value: 0, label: "Any history" },
  { value: 1, label: "1+ filings" },
  { value: 25, label: "25+ filings" },
  { value: 100, label: "100+ filings" },
];
const POSTED = [
  { value: 0, label: "Any time" },
  { value: 3, label: "Last 3 days" },
  { value: 7, label: "Last week" },
  { value: 30, label: "Last 30 days" },
];

function toFilter(q: string, where: Where, minSponsor: number, posted: number) {
  return {
    ...(q ? { query: q } : {}),
    ...(where === "us-remote" ? { remote: true, usOnly: true } : where === "atlanta" ? { atlanta: true } : where === "us" ? { usOnly: true } : {}),
    ...(minSponsor ? { minSoftwareFilings: minSponsor } : {}),
    ...(posted ? { postedWithinDays: posted } : {}),
  };
}

export default function JobExplorer() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const [q, setQ] = useState(params.get("q") ?? "");
  const [debouncedQ, setDebouncedQ] = useState(q);
  const [where, setWhere] = useState<Where>((params.get("where") as Where) ?? "us-remote");
  const [minSponsor, setMinSponsor] = useState(Number(params.get("sponsor") ?? 1));
  const [posted, setPosted] = useState(Number(params.get("posted") ?? 0));
  const [edges, setEdges] = useState<JobsResult["jobs"]["edges"]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [pageInfo, setPageInfo] = useState<JobsResult["jobs"]["pageInfo"] | null>(null);
  const [state, setState] = useState<"idle" | "loading" | "error">("loading");
  const [error, setError] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 250);
    return () => clearTimeout(t);
  }, [q]);

  const filter = useMemo(() => toFilter(debouncedQ, where, minSponsor, posted), [debouncedQ, where, minSponsor, posted]);

  // Keep the URL in sync so a filtered view can be shared or bookmarked.
  useEffect(() => {
    const next = new URLSearchParams();
    if (debouncedQ) next.set("q", debouncedQ);
    if (where !== "us-remote") next.set("where", where);
    if (minSponsor !== 1) next.set("sponsor", String(minSponsor));
    if (posted) next.set("posted", String(posted));
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [debouncedQ, where, minSponsor, posted, pathname, router]);

  useEffect(() => {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setState("loading");
    gql<JobsResult>(JOBS_QUERY, { filter }, ctrl.signal)
      .then((d) => {
        setEdges(d.jobs.edges);
        setTotal(d.jobs.totalCount);
        setPageInfo(d.jobs.pageInfo);
        setState("idle");
      })
      .catch((e: Error) => {
        if (e.name === "AbortError") return;
        setError(e.message);
        setState("error");
      });
    return () => ctrl.abort();
  }, [filter]);

  async function loadMore() {
    if (!pageInfo?.endCursor) return;
    setState("loading");
    try {
      const d = await gql<JobsResult>(JOBS_QUERY, { filter, after: pageInfo.endCursor });
      setEdges((prev) => [...prev, ...d.jobs.edges]);
      setPageInfo(d.jobs.pageInfo);
      setState("idle");
    } catch (e) {
      setError((e as Error).message);
      setState("error");
    }
  }

  const selectClass = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";

  return (
    <section aria-labelledby="jobs-heading" className="mt-10">
      <h2 id="jobs-heading" className="text-xl font-semibold">Open frontend and fullstack roles</h2>

      <form className="mt-4 grid gap-3 rounded-xl border border-line bg-surface p-4 sm:grid-cols-2 lg:grid-cols-4" onSubmit={(e) => e.preventDefault()} role="search">
        <label className="flex flex-col gap-1 text-sm sm:col-span-2 lg:col-span-1">
          <span className="text-muted">Search</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Staff, payments, Coinbase…" className={selectClass} />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Location</span>
          <select value={where} onChange={(e) => setWhere(e.target.value as Where)} className={selectClass}>
            {WHERE.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">H-1B sponsorship history</span>
          <select value={minSponsor} onChange={(e) => setMinSponsor(Number(e.target.value))} className={selectClass}>
            {SPONSOR.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-muted">Posted</span>
          <select value={posted} onChange={(e) => setPosted(Number(e.target.value))} className={selectClass}>
            {POSTED.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      </form>

      <p className="mt-4 text-sm text-muted" aria-live="polite">
        {state === "error" ? `Could not load jobs: ${error}` : total == null ? "Loading roles…" : `${num(total)} role${total === 1 ? "" : "s"} match`}
      </p>

      <ul className="mt-3 grid gap-3" aria-busy={state === "loading"}>
        {edges.map(({ node: j }) => (
          <li key={j.id} className="rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/60">
            <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                <a href={j.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">
                  {j.title}
                  <span className="sr-only"> (opens the company job page)</span>
                </a>
                <p className="mt-0.5 text-sm text-muted">
                  <Link href={`/companies/${j.company.slug}`} className="text-ink hover:underline">{j.company.name}</Link>
                  {" · "}{j.location || "Location not listed"}{" · "}{ago(j.postedAt)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                {j.remote && <span className="rounded-full bg-surface-2 px-2.5 py-1">Remote</span>}
                {j.atlanta && <span className="rounded-full bg-surface-2 px-2.5 py-1">Atlanta</span>}
                {j.company.sponsorship ? (
                  <span className="rounded-full bg-accent/15 px-2.5 py-1 font-medium text-accent">
                    {num(j.company.sponsorship.softwareFilings)} H-1B software filings · median {usd(j.company.sponsorship.medianWage)}
                  </span>
                ) : (
                  <span className="rounded-full border border-line px-2.5 py-1 text-muted">No recent H-1B software filings</span>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      {state === "idle" && edges.length === 0 && (
        <p className="mt-6 rounded-xl border border-dashed border-line p-6 text-center text-muted">
          No roles match. Try &ldquo;Anywhere in the US&rdquo; or a lower sponsorship filter.
        </p>
      )}

      {pageInfo?.hasNextPage && (
        <button type="button" onClick={loadMore} disabled={state === "loading"} className="mt-5 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-accent-ink disabled:opacity-60">
          {state === "loading" ? "Loading…" : "Show more roles"}
        </button>
      )}
    </section>
  );
}
