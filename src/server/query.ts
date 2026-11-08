import "server-only";
import { graphql } from "graphql";
import { schema } from "./schema";
import { createLoaders } from "./data";

/** Run a GraphQL query in-process from a Server Component (no HTTP hop, same schema as /api/graphql). */
export async function serverQuery<T>(source: string, variableValues?: Record<string, unknown>): Promise<T> {
  const res = await graphql({ schema, source, variableValues, contextValue: { loaders: createLoaders() } });
  if (res.errors?.length) throw new Error(res.errors.map((e) => e.message).join("; "));
  return res.data as T;
}
