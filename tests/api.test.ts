import { describe, expect, it } from "vitest";
import DataLoader from "dataloader";
import { createYoga } from "graphql-yoga";
import { schema, type Context } from "@/server/schema";
import * as data from "@/server/data";

function client() {
  const yoga = createYoga<object, Context>({ schema, context: () => ({ loaders: data.createLoaders() }), maskedErrors: false });
  return async (query: string, variables?: Record<string, unknown>) => {
    const res = await yoga.fetch("http://test/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }),
    });
    return res.json();
  };
}

describe("Sponsor Radar GraphQL API", () => {
  const gql = client();

  it("reports stats that match the data files", async () => {
    const { data: d } = await gql(`{ stats { trackedCompanies openRoles lcaEmployers } }`);
    expect(d.stats.trackedCompanies).toBeGreaterThan(50);
    expect(d.stats.openRoles).toBe(data.jobs.length);
    expect(d.stats.lcaEmployers).toBe(data.employers.length);
  });

  it("paginates companies with cursors and no overlap", async () => {
    const q = `query($after: String) { companies(first: 10, after: $after) { totalCount edges { cursor node { slug } } pageInfo { hasNextPage endCursor } } }`;
    const p1 = (await gql(q)).data.companies;
    const p2 = (await gql(q, { after: p1.pageInfo.endCursor })).data.companies;
    expect(p1.edges).toHaveLength(10);
    expect(p1.pageInfo.hasNextPage).toBe(true);
    const a = p1.edges.map((e: { node: { slug: string } }) => e.node.slug);
    const b = p2.edges.map((e: { node: { slug: string } }) => e.node.slug);
    expect(a.filter((s: string) => b.includes(s))).toEqual([]);
  });

  it("sorts sponsors by software filings, highest first", async () => {
    const { data: d } = await gql(`{ companies(first: 5, filter: { sponsorsH1B: true }) { edges { node { sponsorship { softwareFilings } } } } }`);
    const n = d.companies.edges.map((e: { node: { sponsorship: { softwareFilings: number } } }) => e.node.sponsorship.softwareFilings);
    expect([...n].sort((x, y) => y - x)).toEqual(n);
  });

  it("filters jobs to US remote roles only", async () => {
    const { data: d } = await gql(`{ jobs(first: 100, filter: { remote: true, usOnly: true }) { edges { node { remote usBased } } } }`);
    for (const e of d.jobs.edges) expect(e.node).toEqual({ remote: true, usBased: true });
  });

  it("batches sponsorship lookups: one batch for a whole page of jobs (no N+1)", async () => {
    let batches = 0;
    let keysSeen = 0;
    const yoga = createYoga<object, Context>({
      schema,
      context: () => {
        const loaders = data.createLoaders();
        loaders.sponsorship = new DataLoader(async (slugs: readonly string[]) => {
          batches++;
          keysSeen += slugs.length;
          return slugs.map((s) => {
            const c = data.companiesBySlug.get(s);
            return c ? data.sponsorshipFor(c) : null;
          });
        });
        return { loaders };
      },
    });
    const res = await yoga.fetch("http://test/graphql", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: `{ jobs(first: 50) { edges { node { company { slug sponsorship { softwareFilings } } } } } }` }),
    });
    const body = await res.json();
    const companies = new Set(body.data.jobs.edges.map((e: { node: { company: { slug: string } } }) => e.node.company.slug));
    expect(batches).toBe(1);
    expect(keysSeen).toBe(companies.size); // each company resolved once, however many jobs it has
  });

  it("rejects a bad cursor and an oversized page with clear errors", async () => {
    const bad = await gql(`{ jobs(first: 5, after: "nope") { totalCount } }`);
    expect(bad.errors[0].message).toBe("Invalid cursor");
    const big = await gql(`{ jobs(first: 500) { totalCount } }`);
    expect(big.errors[0].message).toMatch(/first must be between 1 and 100/);
  });

  it("searches raw employer names in the government data", async () => {
    const { data: d } = await gql(`{ employers(search: "databricks") { name softwareFilings } }`);
    expect(d.employers[0].name).toMatch(/DATABRICKS/);
    expect(d.employers[0].softwareFilings).toBeGreaterThan(0);
  });
});
