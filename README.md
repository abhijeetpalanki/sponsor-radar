# Sponsor Radar

Which companies hiring frontend engineers actually sponsor H-1B visas?

Sponsor Radar joins two public sources:

- **U.S. Department of Labor H-1B filings** (Labor Condition Application disclosure data): every certified H-1B filing for a software occupation, reduced to a per-employer summary (filings, median wage, states).
- **Public job boards** (Greenhouse, Ashby, Lever): open frontend and fullstack roles at the tracked companies.

## Stack

- Next.js 15 (App Router) + TypeScript
- GraphQL API in Node.js with GraphQL Yoga at `/api/graphql` (cursor pagination, DataLoader batching, typed errors)
- Vitest for API tests
- Hosted on Netlify

## Run locally

```bash
npm install
npm run dev            # http://localhost:3000, API + GraphiQL at /api/graphql
npm test
```

## Refresh the data

```bash
npm run data:jobs                                  # job boards, safe to run nightly
npm run data:lca -- data/raw/LCA_Disclosure_*.xlsx # H-1B filings, quarterly (download from dol.gov)
```

DOL publishes the disclosure files quarterly at https://www.dol.gov/agencies/eta/foreign-labor/performance. The raw spreadsheets are large and are not committed; only the summary in `data/employers.json` is.

## Caveats

- H-1B filings show intent to employ, not hires, and frontend work is usually filed under generic titles such as "Software Engineer", so total software filings is the more useful signal.
- Company-to-employer matching uses the legal entity names in `src/server/companies.ts` and is checked by hand.
