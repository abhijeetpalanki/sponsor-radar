// Companies we track. `board` is the public job-board id; `lca` matches the
// employer name as it appears in Department of Labor H-1B filings (uppercase).
export type Ats = "greenhouse" | "ashby" | "lever";

export interface CompanySeed {
  slug: string;
  name: string;
  ats: Ats;
  board: string;
  lca: RegExp;
}

const gh = (slug: string, name: string, lca: RegExp, board = slug): CompanySeed => ({ slug, name, ats: "greenhouse", board, lca });
const ab = (slug: string, name: string, lca: RegExp, board = slug): CompanySeed => ({ slug, name, ats: "ashby", board, lca });
const lv = (slug: string, name: string, lca: RegExp, board = slug): CompanySeed => ({ slug, name, ats: "lever", board, lca });

export const COMPANIES: CompanySeed[] = [
  gh("coinbase", "Coinbase", /^COINBASE\b/),
  gh("seatgeek", "SeatGeek", /^SEATGEEK\b/),
  gh("airbnb", "Airbnb", /^AIRBNB\b/),
  gh("stripe", "Stripe", /^STRIPE,? INC/),
  gh("figma", "Figma", /^FIGMA\b/),
  gh("discord", "Discord", /^DISCORD\b/),
  gh("reddit", "Reddit", /^REDDIT\b/),
  gh("pinterest", "Pinterest", /^PINTEREST\b/),
  gh("robinhood", "Robinhood", /^ROBINHOOD (MARKETS|FINANCIAL|SECURITIES)\b/),
  gh("affirm", "Affirm", /^AFFIRM,? INC/),
  gh("dropbox", "Dropbox", /^DROPBOX\b/),
  gh("databricks", "Databricks", /^DATABRICKS\b/),
  gh("datadog", "Datadog", /^DATADOG\b/),
  gh("cloudflare", "Cloudflare", /^CLOUDFLARE\b/),
  gh("twilio", "Twilio", /^TWILIO\b/),
  gh("okta", "Okta", /^OKTA\b/),
  gh("gitlab", "GitLab", /^GITLAB\b/),
  gh("elastic", "Elastic", /^ELASTIC(SEARCH)?,? INC|^ELASTICSEARCH\b/),
  gh("mongodb", "MongoDB", /^MONGODB\b/),
  gh("instacart", "Instacart", /^MAPLEBEAR\b|^INSTACART\b/),
  gh("lyft", "Lyft", /^LYFT\b/),
  gh("asana", "Asana", /^ASANA\b/),
  gh("samsara", "Samsara", /^SAMSARA\b/),
  gh("brex", "Brex", /^BREX\b/),
  gh("chime", "Chime", /^CHIME FINANCIAL\b/),
  gh("gusto", "Gusto", /^GUSTO\b|^ZENPAYROLL\b/),
  gh("vercel", "Vercel", /^VERCEL\b/),
  gh("flexport", "Flexport", /^FLEXPORT\b/),
  gh("toast", "Toast", /^TOAST,? INC/),
  gh("duolingo", "Duolingo", /^DUOLINGO\b/),
  gh("peloton", "Peloton", /^PELOTON INTERACTIVE\b/),
  gh("mercury", "Mercury", /^MERCURY TECHNOLOGIES\b/),
  gh("upstart", "Upstart", /^UPSTART (NETWORK|HOLDINGS)\b/),
  gh("tekmetric", "Tekmetric", /^TEKMETRIC\b/),
  gh("squarespace", "Squarespace", /^SQUARESPACE\b/),
  gh("intercom", "Intercom", /^INTERCOM\b/),
  ab("hims-and-hers", "Hims & Hers", /^HIMS,? INC|^HIMS (&|AND) HERS\b/),
  ab("ramp", "Ramp", /^RAMP BUSINESS\b/),
  ab("notion", "Notion", /^NOTION LABS\b/),
  ab("linear", "Linear", /^LINEAR ORBIT\b/),
  ab("openai", "OpenAI", /^OPENAI\b/),
  ab("plaid", "Plaid", /^PLAID,? INC/),
  ab("replit", "Replit", /^REPLIT\b/),
  ab("supabase", "Supabase", /^SUPABASE\b/),
  ab("vanta", "Vanta", /^VANTA\b/),
  ab("zapier", "Zapier", /^ZAPIER\b/),
  ab("scribe", "Scribe", /^SCRIBE(HOW)?\b/),
  ab("phantom", "Phantom", /^PHANTOM TECHNOLOGIES\b/),
  ab("posthog", "PostHog", /^POSTHOG\b/),
  ab("sentry", "Sentry", /^FUNCTIONAL SOFTWARE\b/),
  ab("cursor", "Cursor", /^ANYSPHERE\b/),
  ab("perplexity", "Perplexity", /^PERPLEXITY\b/),
  ab("harvey", "Harvey", /^HARVEY AI\b|^COUNSEL AI\b/),
  ab("mercor", "Mercor", /^MERCOR\b/),
  lv("palantir", "Palantir", /^PALANTIR\b/),
  lv("spotify", "Spotify", /^SPOTIFY\b/),
];
