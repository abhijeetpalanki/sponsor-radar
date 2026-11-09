import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { serverQuery } from "@/server/query";
import { COMPANIES } from "@/server/companies";
import { ago, num, usd } from "@/lib/format";
import TierBadge, { type SponsorshipTier } from "@/components/TierBadge";

interface CompanyData {
  company: {
    name: string;
    ats: string;
    careersUrl: string;
    sponsorshipTier: SponsorshipTier;
    sponsorship: {
      employerNames: string[];
      softwareFilings: number;
      frontendFilings: number;
      medianWage: number | null;
      topStates: { state: string; count: number }[];
      topFrontendTitles: { title: string; count: number }[];
      fiscalYears: string[];
    } | null;
    openRoles: { id: string; title: string; location: string; remote: boolean; url: string; postedAt: string | null }[];
  } | null;
}

const COMPANY_QUERY = /* GraphQL */ `
  query Company($slug: ID!) {
    company(slug: $slug) {
      name ats careersUrl sponsorshipTier
      sponsorship { employerNames softwareFilings frontendFilings medianWage topStates { state count } topFrontendTitles { title count } fiscalYears }
      openRoles(filter: { usOnly: true }) { id title location remote url postedAt }
    }
  }
`;

export function generateStaticParams() {
  return COMPANIES.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const c = COMPANIES.find((x) => x.slug === slug);
  return c ? { title: `${c.name} H-1B sponsorship and frontend roles` } : {};
}

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { company: c } = await serverQuery<CompanyData>(COMPANY_QUERY, { slug });
  if (!c) notFound();
  const s = c.sponsorship;
  const maxState = Math.max(1, ...(s?.topStates.map((x) => x.count) ?? [1]));

  return (
    <article>
      <Link href="/" className="text-sm text-muted hover:text-ink">← All roles</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-bold tracking-tight">{c.name}</h1>
        <TierBadge tier={c.sponsorshipTier} />
      </div>

      <section aria-labelledby="sp-heading" className="mt-6 rounded-xl border border-line bg-surface p-5">
        <h2 id="sp-heading" className="font-semibold">H-1B sponsorship for software roles</h2>
        {s ? (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-sm text-muted">Certified software filings</dt><dd className="text-2xl font-semibold">{num(s.softwareFilings)}</dd></div>
              <div><dt className="text-sm text-muted">Median offered wage</dt><dd className="text-2xl font-semibold">{usd(s.medianWage)}</dd></div>
              <div><dt className="text-sm text-muted">Frontend-titled filings</dt><dd className="text-2xl font-semibold">{num(s.frontendFilings)}</dd></div>
              <div><dt className="text-sm text-muted">Fiscal years</dt><dd className="text-2xl font-semibold">{s.fiscalYears.join(", ")}</dd></div>
            </dl>

            {s.topStates.length > 0 && (
              <figure className="mt-6">
                <figcaption className="text-sm text-muted">Where the filings are</figcaption>
                <ul className="mt-2 grid gap-1.5">
                  {s.topStates.map((st) => (
                    <li key={st.state} className="grid grid-cols-[3rem_1fr_3rem] items-center gap-2 text-sm">
                      <span className="font-mono">{st.state}</span>
                      <span className="h-2.5 rounded-full bg-surface-2" aria-hidden>
                        <span className="block h-full rounded-full bg-accent" style={{ width: `${(st.count / maxState) * 100}%` }} />
                      </span>
                      <span className="text-right tabular-nums">{num(st.count)}</span>
                    </li>
                  ))}
                </ul>
              </figure>
            )}

            {s.topFrontendTitles.length > 0 && (
              <p className="mt-5 text-sm text-muted">Frontend titles on filings: {s.topFrontendTitles.map((t) => `${t.title} (${t.count})`).join(", ")}</p>
            )}
            <p className="mt-5 text-xs text-muted">
              Matched legal entities: {s.employerNames.join("; ")}. Large companies file most frontend work under generic titles such as
              &ldquo;Software Engineer&rdquo;, so total software filings is the stronger signal.
            </p>
          </>
        ) : (
          <p className="mt-3 text-muted">
            No certified H-1B software filings found in the latest two disclosure files. That does not rule out sponsorship, but it is not
            routine here. Ask the recruiter early.
          </p>
        )}
      </section>

      <section aria-labelledby="roles-heading" className="mt-8">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="roles-heading" className="text-xl font-semibold">US frontend and fullstack roles ({c.openRoles.length})</h2>
          <a href={c.careersUrl} className="text-sm text-accent hover:underline">All jobs on {c.name}&apos;s board</a>
        </div>
        {c.openRoles.length ? (
          <ul className="mt-4 grid gap-3">
            {c.openRoles.map((j) => (
              <li key={j.id} className="rounded-xl border border-line bg-surface p-4">
                <a href={j.url} target="_blank" rel="noopener noreferrer" className="font-medium hover:underline">{j.title}</a>
                <p className="mt-0.5 text-sm text-muted">{j.location || "Location not listed"}{j.remote ? " · Remote" : ""} · {ago(j.postedAt)}</p>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-muted">No US frontend or fullstack roles open right now.</p>
        )}
      </section>
    </article>
  );
}
