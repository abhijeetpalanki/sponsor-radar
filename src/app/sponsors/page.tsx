import type { Metadata } from "next";
import { Suspense } from "react";
import SponsorSearch from "@/components/SponsorSearch";

export const metadata: Metadata = { title: "H-1B sponsor search" };

export default function SponsorsPage() {
  return (
    <>
      <h1 className="text-3xl font-bold tracking-tight">Does this company sponsor?</h1>
      <p className="mt-3 max-w-2xl text-muted">
        Search any employer in the latest U.S. Department of Labor H-1B disclosure data, not only the companies tracked on the jobs page.
        Counts cover certified filings for software occupations.
      </p>
      <Suspense fallback={null}>
        <SponsorSearch />
      </Suspense>
    </>
  );
}
