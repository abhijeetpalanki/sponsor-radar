import { createYoga } from "graphql-yoga";
import { schema, type Context } from "@/server/schema";
import { createLoaders } from "@/server/data";

const { handleRequest } = createYoga<object, Context>({
  schema,
  graphqlEndpoint: "/api/graphql",
  fetchAPI: { Response },
  // Fresh DataLoaders per request so batching never leaks between users.
  context: () => ({ loaders: createLoaders() }),
  // GraphiQL stays on in production: the API is public and read-only, and it doubles as documentation.
  graphiql: { title: "Sponsor Radar API", defaultQuery: `{\n  stats { trackedCompanies openRoles usRemoteRoles }\n  companies(first: 5) {\n    edges { node { name sponsorship { softwareFilings medianWage } openRoleCount } }\n  }\n}` },
  maskedErrors: process.env.NODE_ENV === "production",
});

export const runtime = "nodejs";

export async function GET(request: Request) {
  return handleRequest(request, {});
}

export async function POST(request: Request) {
  return handleRequest(request, {});
}

export async function OPTIONS(request: Request) {
  return handleRequest(request, {});
}
