import { describe, expect, it } from "vitest";
import { mergeJobs, tooManyFailures, type Job } from "../scripts/lib/merge-jobs";

const job = (company: string, id: string, title = "Frontend Engineer"): Job => ({
  id, company, title, location: "Remote - US", remote: true, usBased: true, atlanta: false, url: `https://example.com/${id}`, postedAt: null,
});

describe("mergeJobs", () => {
  it("keeps yesterday's roles for a board that failed today", () => {
    const previous = [job("airbnb", "a1"), job("stripe", "s1")];
    const fresh = new Map([["airbnb", [job("airbnb", "a1"), job("airbnb", "a2")]]]);
    const r = mergeJobs(previous, fresh, ["stripe"]);
    expect(r.jobs.map((j) => j.id)).toEqual(["a1", "a2", "s1"]);
    expect(r.carriedOver).toEqual(["stripe"]);
    expect(r.changed).toBe(true);
  });

  it("drops roles that closed on a board that answered", () => {
    const r = mergeJobs([job("airbnb", "a1"), job("airbnb", "a2")], new Map([["airbnb", [job("airbnb", "a2")]]]), []);
    expect(r.jobs.map((j) => j.id)).toEqual(["a2"]);
    expect(r.changed).toBe(true);
  });

  it("reports no change when only the API's ordering differs", () => {
    const previous = [job("stripe", "s2"), job("airbnb", "a1"), job("stripe", "s1")];
    const fresh = new Map([
      ["stripe", [job("stripe", "s1"), job("stripe", "s2")]],
      ["airbnb", [job("airbnb", "a1")]],
    ]);
    expect(mergeJobs(previous, fresh, []).changed).toBe(false);
  });

  it("does not list a failed board as carried over when it had no roles before", () => {
    expect(mergeJobs([], new Map(), ["linear"]).carriedOver).toEqual([]);
  });
});

describe("tooManyFailures", () => {
  it("allows a few flaky boards but stops a run where more than a quarter fail", () => {
    expect(tooManyFailures(3, 56)).toBe(false);
    expect(tooManyFailures(14, 56)).toBe(false);
    expect(tooManyFailures(15, 56)).toBe(true);
    expect(tooManyFailures(0, 0)).toBe(false);
  });
});
