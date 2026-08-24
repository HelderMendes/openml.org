import { NextRequest, NextResponse } from "next/server";
import { fetchElasticsearch, getElasticsearchUrl } from "@/lib/elasticsearch";
import ElasticsearchAPIConnector from "@elastic/search-ui-elasticsearch-connector";

// Cache for connectors to improve performance
const connectorsCache: Record<string, ElasticsearchAPIConnector> = {};

type ElasticsearchFallbackPayload = {
  took: number;
  timed_out: boolean;
  _shards: {
    total: number;
    successful: number;
    skipped: number;
    failed: number;
  };
  hits: {
    total: { value: number; relation: "eq" };
    max_score: number | null;
    hits: unknown[];
  };
  aggregations?: Record<string, unknown>;
};

// Process-local snapshot cache per index for stale fallback during upstream incidents.
const latestSearchSnapshotByIndex = new Map<
  string,
  ElasticsearchFallbackPayload
>();

function createEmptySearchPayload(): ElasticsearchFallbackPayload {
  return {
    took: 0,
    timed_out: false,
    _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
    hits: {
      total: { value: 0, relation: "eq" },
      max_score: null,
      hits: [],
    },
    aggregations: {},
  };
}

/**
 * Robust search proxy for Elasticsearch
 * Supports:
 * 1. @elastic/search-ui-elasticsearch-connector requests (via onSearch)
 * 2. Multi-search (_msearch) requests
 * 3. Direct _search requests
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();

    // Case 1: Search UI Connector request (matches legacy app)
    if (body.requestState && body.queryConfig && body.indexName) {
      const { requestState, queryConfig, indexName } = body;

      if (!connectorsCache[indexName]) {
        connectorsCache[indexName] = new ElasticsearchAPIConnector({
          host: getElasticsearchUrl(""),
          index: indexName,
          apiKey: "", // Add if needed in production
        });
      }

      const response = await connectorsCache[indexName].onSearch(
        requestState,
        queryConfig,
      );

      return NextResponse.json(response);
    }

    // Case 2: Custom es-proxy request (from OpenMLSearchConnector)
    if (body.indexName && body.esQuery) {
      const { indexName, esQuery } = body;
      const { response, source } = await fetchElasticsearch(
        `${indexName}/_search`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(esQuery),
          cache: "no-store",
        },
        {
          fallbackStatuses: [403, 404],
          timeoutMsPrimary: 3000,
          timeoutMsLegacy: 4000,
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[Search API] ES Error:`, errorText);

        if (response.status === 403) {
          const stale = latestSearchSnapshotByIndex.get(indexName);
          if (stale) {
            return NextResponse.json(stale, {
              status: 200,
              headers: {
                "X-Search-Source": "stale-fallback",
                "Cache-Control":
                  "public, max-age=30, s-maxage=120, stale-while-revalidate=600",
              },
            });
          }

          return NextResponse.json(createEmptySearchPayload(), {
            status: 200,
            headers: {
              "X-Search-Source": "empty-fallback",
              "Cache-Control":
                "public, max-age=15, s-maxage=60, stale-while-revalidate=300",
            },
          });
        }

        throw new Error(
          `Elasticsearch returned ${response.status}: ${errorText}`,
        );
      }

      const data = await response.json();
      latestSearchSnapshotByIndex.set(
        indexName,
        data as ElasticsearchFallbackPayload,
      );

      return NextResponse.json(data, {
        headers: {
          "X-Search-Source": source,
        },
      });
    }

    // Case 3: Raw multi-search or other requests (fallback)
    return NextResponse.json(
      { error: "Unsupported search request format" },
      { status: 400 },
    );
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ [Search API] Failed after ${duration}ms:`, error.message);

    // Log full Elasticsearch error details
    if (error.response) {
      console.error(`[Search API] ES Error Status:`, error.response.status);
      console.error(
        `[Search API] ES Error Data:`,
        JSON.stringify(error.response.data, null, 2),
      );
    }

    return NextResponse.json(
      {
        error: "Search failed",
        details: error.message,
      },
      { status: 502 },
    );
  }
}
