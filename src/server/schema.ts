import { createSchema } from "graphql-yoga";
import { GraphQLError } from "graphql";
import { COMPANIES, type CompanySeed } from "./companies";
import { dataMeta, employers, jobs, type JobRecord, type Loaders, type Sponsorship } from "./data";

export interface Context {
  loaders: Loaders;
}

const typeDefs = /* GraphQL */ `
  """A company we track: its public job board plus its H-1B filing history."""
  type Company {
    slug: ID!
    name: String!
    ats: String!
    careersUrl: String!
    "Certified H-1B software filings matched to this company, or null if none were found."
    sponsorship: Sponsorship
    openRoleCount: Int!
    openRoles(filter: JobFilter): [Job!]!
  }

  """Summary of certified H-1B Labor Condition Applications for software occupations."""
  type Sponsorship {
    employerNames: [String!]!
    softwareFilings: Int!
    frontendFilings: Int!
    "Median annual wage offered on the filings, in USD."
    medianWage: Int
    topStates: [StateCount!]!
    topFrontendTitles: [TitleCount!]!
    fiscalYears: [String!]!
  }

  type StateCount { state: String!, count: Int! }
  type TitleCount { title: String!, count: Int! }

  type Job {
    id: ID!
    title: String!
    location: String!
    remote: Boolean!
    usBased: Boolean!
    atlanta: Boolean!
    url: String!
    postedAt: String
    company: Company!
  }

  """An employer exactly as it appears in Department of Labor data (not only tracked companies)."""
  type Employer {
    name: String!
    softwareFilings: Int!
    frontendFilings: Int!
    medianWage: Int
    topStates: [StateCount!]!
  }

  input JobFilter {
    "Case-insensitive match on title, company or location."
    query: String
    remote: Boolean
    usOnly: Boolean
    atlanta: Boolean
    postedWithinDays: Int
    "Only companies with at least this many certified H-1B software filings."
    minSoftwareFilings: Int
    "Only companies with at least this many frontend-titled H-1B filings."
    minFrontendFilings: Int
    companySlugs: [ID!]
  }

  input CompanyFilter {
    sponsorsH1B: Boolean
    minSoftwareFilings: Int
    minFrontendFilings: Int
    hasOpenRoles: Boolean
  }

  enum CompanySort { SOFTWARE_FILINGS, FRONTEND_FILINGS, OPEN_ROLES, NAME }

  type PageInfo { hasNextPage: Boolean!, endCursor: String }
  type CompanyEdge { cursor: String!, node: Company! }
  type CompanyConnection { totalCount: Int!, edges: [CompanyEdge!]!, pageInfo: PageInfo! }
  type JobEdge { cursor: String!, node: Job! }
  type JobConnection { totalCount: Int!, edges: [JobEdge!]!, pageInfo: PageInfo! }

  type Stats {
    trackedCompanies: Int!
    companiesWithSponsorship: Int!
    openRoles: Int!
    usRemoteRoles: Int!
    lcaEmployers: Int!
    lcaSources: [String!]!
    jobsUpdatedAt: String!
    sponsorshipUpdatedAt: String!
  }

  type Query {
    companies(filter: CompanyFilter, sort: CompanySort = SOFTWARE_FILINGS, first: Int = 20, after: String): CompanyConnection!
    company(slug: ID!): Company
    jobs(filter: JobFilter, first: Int = 20, after: String): JobConnection!
    "Search every H-1B employer in the government data by name."
    employers(search: String!, first: Int = 10): [Employer!]!
    stats: Stats!
  }
`;

const MAX_PAGE = 100;
const encode = (i: number) => Buffer.from(`o:${i}`).toString("base64url");
const decode = (c?: string | null) => {
  if (!c) return 0;
  const m = Buffer.from(c, "base64url").toString().match(/^o:(\d+)$/);
  if (!m) throw new GraphQLError("Invalid cursor", { extensions: { code: "BAD_USER_INPUT" } });
  return Number(m[1]) + 1;
};

function paginate<T>(items: T[], first = 20, after?: string | null) {
  if (first < 1 || first > MAX_PAGE) throw new GraphQLError(`first must be between 1 and ${MAX_PAGE}`, { extensions: { code: "BAD_USER_INPUT" } });
  const start = decode(after);
  const slice = items.slice(start, start + first);
  return {
    totalCount: items.length,
    edges: slice.map((node, i) => ({ cursor: encode(start + i), node })),
    pageInfo: { hasNextPage: start + first < items.length, endCursor: slice.length ? encode(start + slice.length - 1) : null },
  };
}

interface JobFilter {
  query?: string | null;
  remote?: boolean | null;
  usOnly?: boolean | null;
  atlanta?: boolean | null;
  postedWithinDays?: number | null;
  minSoftwareFilings?: number | null;
  minFrontendFilings?: number | null;
  companySlugs?: string[] | null;
}

async function filterJobs(list: JobRecord[], f: JobFilter | null | undefined, loaders: Loaders) {
  if (!f) return list;
  const q = f.query?.trim().toLowerCase();
  const since = f.postedWithinDays ? Date.now() - f.postedWithinDays * 86_400_000 : null;
  let okCompanies: Set<string> | null = null;
  if (f.minSoftwareFilings != null || f.minFrontendFilings != null) {
    const slugs = [...new Set(list.map((j) => j.company))];
    const sponsorship = (await loaders.sponsorship.loadMany(slugs)) as (Sponsorship | null)[];
    okCompanies = new Set(
      slugs.filter((_, i) =>
        (sponsorship[i]?.softwareFilings ?? 0) >= (f.minSoftwareFilings ?? 0) &&
        (sponsorship[i]?.frontendFilings ?? 0) >= (f.minFrontendFilings ?? 0),
      ),
    );
  }
  return list.filter((j) =>
    (!q || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(q)) &&
    (f.remote == null || j.remote === f.remote) &&
    (!f.usOnly || j.usBased) &&
    (!f.atlanta || j.atlanta) &&
    (!since || (j.postedAt != null && Date.parse(j.postedAt) >= since)) &&
    (!okCompanies || okCompanies.has(j.company)) &&
    (!f.companySlugs?.length || f.companySlugs.includes(j.company)),
  );
}

const careersUrl = (c: CompanySeed) =>
  c.ats === "greenhouse" ? `https://job-boards.greenhouse.io/${c.board}` : c.ats === "ashby" ? `https://jobs.ashbyhq.com/${c.board}` : `https://jobs.lever.co/${c.board}`;

const byPostedDesc = (a: JobRecord, b: JobRecord) => (b.postedAt ?? "").localeCompare(a.postedAt ?? "");

export const schema = createSchema<Context>({
  typeDefs,
  resolvers: {
    Query: {
      async companies(_, args: { filter?: { sponsorsH1B?: boolean; minSoftwareFilings?: number; minFrontendFilings?: number; hasOpenRoles?: boolean }; sort: string; first: number; after?: string }, { loaders }) {
        const sp = await loaders.sponsorship.loadMany(COMPANIES.map((c) => c.slug));
        const roles = await loaders.openRoles.loadMany(COMPANIES.map((c) => c.slug));
        const rows = COMPANIES.map((c, i) => ({ c, s: sp[i] as Sponsorship | null, n: (roles[i] as JobRecord[]).length }));
        const f = args.filter ?? {};
        const kept = rows.filter(({ s, n }) =>
          (f.sponsorsH1B == null || (s != null && s.softwareFilings > 0) === f.sponsorsH1B) &&
          (!f.minSoftwareFilings || (s?.softwareFilings ?? 0) >= f.minSoftwareFilings) &&
          (!f.minFrontendFilings || (s?.frontendFilings ?? 0) >= f.minFrontendFilings) &&
          (f.hasOpenRoles == null || n > 0 === f.hasOpenRoles),
        );
        const sorters: Record<string, (a: (typeof rows)[0], b: (typeof rows)[0]) => number> = {
          SOFTWARE_FILINGS: (a, b) => (b.s?.softwareFilings ?? 0) - (a.s?.softwareFilings ?? 0),
          FRONTEND_FILINGS: (a, b) => (b.s?.frontendFilings ?? 0) - (a.s?.frontendFilings ?? 0),
          OPEN_ROLES: (a, b) => b.n - a.n,
          NAME: (a, b) => a.c.name.localeCompare(b.c.name),
        };
        kept.sort(sorters[args.sort] ?? sorters.SOFTWARE_FILINGS);
        return paginate(kept.map((r) => r.c), args.first, args.after);
      },
      company: (_, { slug }: { slug: string }, { loaders }) => loaders.company.load(slug),
      async jobs(_, args: { filter?: JobFilter; first: number; after?: string }, { loaders }) {
        const list = await filterJobs([...jobs].sort(byPostedDesc), args.filter, loaders);
        return paginate(list, args.first, args.after);
      },
      employers(_, { search, first }: { search: string; first: number }) {
        const q = search.trim().toUpperCase();
        if (q.length < 2) throw new GraphQLError("search must be at least 2 characters", { extensions: { code: "BAD_USER_INPUT" } });
        return employers.filter((e) => e.name.includes(q)).slice(0, Math.min(first, 50));
      },
      stats: () => ({
        trackedCompanies: COMPANIES.length,
        companiesWithSponsorship: COMPANIES.filter((c) => employers.some((e) => c.lca.test(e.name))).length,
        openRoles: jobs.length,
        usRemoteRoles: jobs.filter((j) => j.remote && j.usBased).length,
        lcaEmployers: employers.length,
        lcaSources: dataMeta.lcaSources,
        jobsUpdatedAt: dataMeta.jobsGeneratedAt,
        sponsorshipUpdatedAt: dataMeta.employersGeneratedAt,
      }),
    },
    Company: {
      careersUrl: (c: CompanySeed) => careersUrl(c),
      sponsorship: (c: CompanySeed, _a: unknown, { loaders }: Context) => loaders.sponsorship.load(c.slug),
      openRoleCount: async (c: CompanySeed, _a: unknown, { loaders }: Context) => (await loaders.openRoles.load(c.slug)).length,
      openRoles: async (c: CompanySeed, { filter }: { filter?: JobFilter }, { loaders }: Context) =>
        filterJobs([...(await loaders.openRoles.load(c.slug))].sort(byPostedDesc), filter, loaders),
    },
    Job: {
      company: async (j: JobRecord, _a: unknown, { loaders }: Context) => {
        const c = await loaders.company.load(j.company);
        if (!c) throw new GraphQLError(`Unknown company ${j.company}`);
        return c;
      },
    },
  },
});
