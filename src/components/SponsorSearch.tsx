"use client";

import { useEffect, useState } from "react";
import { gql } from "@/lib/gql";
import { num, usd } from "@/lib/format";

interface Employer {
  name: string;
  softwareFilings: number;
  frontendFilings: number;
  medianWage: number | null;
  topStates: { state: string; count: number }[];
}

const QUERY = /* GraphQL */ `
  query Employers($search: String!) {
    employers(search: $search, first: 25) { name softwareFilings frontendFilings medianWage topStates { state count } }
  }
`;

export default function SponsorSearch() {
  const [q, setQ] = useState("");
  const [rows, setRows] = useState<Employer[] | null>(null);
  const [status, setStatus] = useState("");

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setRows(null);
      setStatus("");
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(() => {
      setStatus("Searching…");
      gql<{ employers: Employer[] }>(QUERY, { search: term }, ctrl.signal)
        .then((d) => {
          setRows(d.employers);
          setStatus(`${d.employers.length} employer${d.employers.length === 1 ? "" : "s"} found${d.employers.length === 25 ? " (showing the first 25)" : ""}`);
        })
        .catch((e: Error) => e.name !== "AbortError" && setStatus(`Search failed: ${e.message}`));
    }, 250);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  return (
    <div className="mt-6">
      <label className="flex max-w-xl flex-col gap-1 text-sm" role="search">
        <span className="text-muted">Employer name</span>
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="e.g. Delta, Home Depot, Intuit" className="rounded-lg border border-line bg-surface px-3 py-2 text-base" />
      </label>
      <p className="mt-3 text-sm text-muted" aria-live="polite">{status}</p>

      {rows && rows.length > 0 && (
        <div className="mt-3 overflow-x-auto rounded-xl border border-line bg-surface">
          <table className="w-full min-w-[36rem] text-sm">
            <caption className="sr-only">Employers matching “{q}”</caption>
            <thead className="bg-surface-2 text-left text-muted">
              <tr>
                <th scope="col" className="px-4 py-2 font-medium">Employer (as filed)</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Software filings</th>
                <th scope="col" className="px-4 py-2 text-right font-medium">Median wage</th>
                <th scope="col" className="px-4 py-2 font-medium">Top states</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => (
                <tr key={e.name} className="border-t border-line">
                  <th scope="row" className="px-4 py-2 text-left font-medium">{e.name}</th>
                  <td className="px-4 py-2 text-right tabular-nums">{num(e.softwareFilings)}</td>
                  <td className="px-4 py-2 text-right tabular-nums">{usd(e.medianWage)}</td>
                  <td className="px-4 py-2 text-muted">{e.topStates.slice(0, 3).map((s) => `${s.state} ${s.count}`).join(" · ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows && rows.length === 0 && <p className="mt-3 text-muted">No employer with that name has 5 or more certified software filings in the data.</p>}
    </div>
  );
}
