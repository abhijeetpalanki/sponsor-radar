import Link from "next/link";
import { Suspense } from "react";
import JobExplorer from "@/components/JobExplorer";
import { serverQuery } from "@/server/query";
import { num, usd } from "@/lib/format";

interface HomeData {
  stats: { trackedCompanies: number; companiesWithSponsorship: number; openRoles: number; usRemoteRoles: number; lcaEmployers: number; jobsUpdatedAt: string };
  companies: { edges: { node: { slug: string; name: string; openRoleCount: number; sponsorship: { softwareFilings: number; medianWage: number | null } | null } }[] };
}

const HOME_QUERY = /* GraphQL */ `
  {
    stats { trackedCompanies companiesWithSponsorship openRoles usRemoteRoles lcaEmployers jobsUpdatedAt }
    companies(first: 8, filter: { sponsorsH1B: true, hasOpenRoles: true }, sort: SOFTWARE_FILINGS) {
      edges { node { slug name openRoleCount sponsorship { softwareFilings medianWage } } }
    }
  }
`;

export default async function Home() {
  const { stats, companies } = await serverQuery<HomeData>(HOME_QUERY);
  const updated = new Date(stats.jobsUpdatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <>
      <section className="max-w-3xl">
        <p className="font-mono text-sm text-accent">&gt; H-1B sponsors × frontend jobs</p>
        <h1 className="mt-2 text-4xl font-bold tracking-tight sm:text-5xl">
          Find frontend roles at companies that <span className="text-gold">actually sponsor</span>.
        </h1>
        <p className="mt-4 text-lg text-muted">
          Every open role here is matched to the employer&apos;s certified H-1B filings for software jobs, straight from U.S. Department of
          Labor data, so you can apply where sponsorship is routine instead of guessing.
        </p>
      </section>

      <dl className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [num(stats.openRoles), "open frontend and fullstack roles"],
          [num(stats.usRemoteRoles), "of them US remote"],
          [`${stats.companiesWithSponsorship} / ${stats.trackedCompanies}`, "tracked companies with H-1B filings"],
          [num(stats.lcaEmployers), "employers in the H-1B data"],
        ].map(([value, label]) => (
          <div key={label} className="flex flex-col rounded-xl border border-line bg-surface p-4">
            <dt className="text-sm text-muted">{label}</dt>
            <dd className="order-first text-2xl font-semibold">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-xs text-muted">Jobs updated {updated}.</p>

      <section aria-labelledby="top-heading" className="mt-10">
        <h2 id="top-heading" className="text-xl font-semibold">Hiring now, sponsoring most</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {companies.edges.map(({ node: c }, i) => (
            <li key={c.slug}>
              <Link href={`/companies/${c.slug}`} className="block h-full rounded-xl border border-line bg-surface p-4 hover:border-accent/60">
                <span className="font-mono text-xs text-muted">#{i + 1}</span>
                <span className="mt-1 block font-semibold">{c.name}</span>
                <span className="mt-2 block text-sm text-muted">
                  {num(c.sponsorship?.softwareFilings ?? 0)} software filings · median {usd(c.sponsorship?.medianWage)}
                </span>
                <span className="mt-1 block text-sm text-ok">{c.openRoleCount} open role{c.openRoleCount === 1 ? "" : "s"}</span>
              </Link>
            </li>
          ))}
        </ol>
      </section>

      <Suspense fallback={<p className="mt-10 text-muted">Loading roles…</p>}>
        <JobExplorer />
      </Suspense>
    </>
  );
}
