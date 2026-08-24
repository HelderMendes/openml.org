import { NextResponse } from "next/server";
import { fetchElasticsearch } from "@/lib/elasticsearch";

// Counts change infrequently; cache to avoid triggering the upstream ES rate limiter
export const dynamic = "force-dynamic";

type EntityCount = { index: string; count: number };

type CountQuery = {
  label: string;
  index: string;
  query?: Record<string, unknown>;
};

// One entry per sidebar stat. Each is fetched as its own plain `_search`
// (not batched via `_msearch`) so it gets fetchElasticsearch's full
// resilience — legacy-URL fallback and a retry timeout — which a
// multi-index `_msearch` call structurally can't get (there's no single
// index to build a legacy typed path from). It also means one entity
// failing doesn't take the rest of the sidebar down with it.
const COUNT_QUERIES: CountQuery[] = [
  // Only active datasets count, per team leader request.
  {
    label: "data",
    index: "data",
    query: { term: { "status.keyword": "active" } },
  },
  { label: "task", index: "task" },
  { label: "flow", index: "flow" },
  { label: "run", index: "run" },
  { label: "study", index: "study" },
  { label: "measure", index: "measure" },
  // Breakdown counts for collections/benchmarks and measures sidebar groups.
  {
    label: "study_task",
    index: "study",
    query: { term: { study_type: "task" } },
  },
  {
    label: "study_run",
    index: "study",
    query: { term: { study_type: "run" } },
  },
  {
    label: "measure_data_quality",
    index: "measure",
    query: { term: { measure_type: "data_quality" } },
  },
  {
    label: "measure_evaluation",
    index: "measure",
    query: { term: { measure_type: "evaluation_measure" } },
  },
  {
    label: "measure_procedure",
    index: "measure",
    query: { term: { measure_type: "estimation_procedure" } },
  },
];

// Per-label last-known-good snapshot — lets one entity's transient failure
// fall back to its own last successful value instead of dragging every
// other (possibly currently-healthy) count down with it.
const lastKnownGood = new Map<string, number>();

async function fetchCount(query: CountQuery): Promise<number | null> {
  try {
    const { response } = await fetchElasticsearch(
      `${query.index}/_search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          size: 0,
          ...(query.query ? { query: query.query } : {}),
        }),
        cache: "no-store",
      },
      {
        fallbackStatuses: [403, 404],
        timeoutMsPrimary: 3000,
      },
    );

    if (!response.ok) return null;

    const data = await response.json();
    const total = data.hits?.total;
    return typeof total === "number" ? total : (total?.value ?? null);
  } catch {
    return null;
  }
}

export async function GET() {
  const results = await Promise.all(COUNT_QUERIES.map(fetchCount));

  let freshCount = 0;
  let staleCount = 0;

  const counts: EntityCount[] = COUNT_QUERIES.map((query, i) => {
    const fresh = results[i];
    if (fresh !== null) {
      lastKnownGood.set(query.label, fresh);
      freshCount++;
      return { index: query.label, count: fresh };
    }

    const stale = lastKnownGood.get(query.label);
    if (stale !== undefined) {
      staleCount++;
      return { index: query.label, count: stale };
    }

    return null;
  }).filter((c): c is EntityCount => c !== null);

  const source =
    freshCount === COUNT_QUERIES.length
      ? "modern"
      : freshCount === 0
        ? "stale-fallback"
        : "partial";

  return NextResponse.json(counts, {
    headers: {
      "Cache-Control":
        "public, max-age=60, s-maxage=900, stale-while-revalidate=3600",
      "X-Count-Source": source,
    },
  });
}
