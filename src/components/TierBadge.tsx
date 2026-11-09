export type SponsorshipTier = "ROUTINE" | "REGULAR" | "OCCASIONAL" | "NONE";

const TIERS: Record<SponsorshipTier, { label: string; className: string }> = {
  ROUTINE: { label: "Routine sponsor", className: "bg-ok/15 text-ok" },
  REGULAR: { label: "Regular sponsor", className: "bg-accent/15 text-accent" },
  OCCASIONAL: { label: "Occasional sponsor", className: "bg-gold/15 text-gold" },
  NONE: { label: "No recent filings", className: "border border-line text-muted" },
};

const HINT: Record<SponsorshipTier, string> = {
  ROUTINE: "100 or more certified H-1B software filings",
  REGULAR: "25 to 99 certified H-1B software filings",
  OCCASIONAL: "1 to 24 certified H-1B software filings",
  NONE: "No certified H-1B software filings in the loaded data",
};

/** Colour-coded sponsorship tier. The label carries the meaning, so colour is never the only signal. */
export default function TierBadge({ tier, className = "" }: { tier: SponsorshipTier; className?: string }) {
  const t = TIERS[tier];
  return (
    <span title={HINT[tier]} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${t.className} ${className}`}>
      {t.label}
    </span>
  );
}
