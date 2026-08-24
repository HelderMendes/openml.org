"use server";
import { fetchElasticsearch } from "@/lib/elasticsearch";

interface ElasticsearchBoolQuery {
  must?: Array<Record<string, unknown>>;
  should?: Array<Record<string, unknown>>;
  filter?: Array<Record<string, unknown>>;
}

interface ElasticsearchSearchBody {
  query?: {
    bool?: ElasticsearchBoolQuery;
    [key: string]: unknown;
  };
  size?: number;
  from?: number;
  sort?: Array<Record<string, unknown>>;
  [key: string]: unknown;
}

/**
 * Server action to search runs by flow ID
 */
export async function searchFlowRuns(
  flowId: number,
  body: ElasticsearchSearchBody,
) {
  try {
    const { response } = await fetchElasticsearch(
      "run/_search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          query: {
            ...body.query,
            bool: {
              must: [
                ...(body.query?.bool?.must || []),
                { term: { "run_flow.flow_id": flowId } },
              ],
            },
          },
        }),
        cache: "no-store",
      },
      {
        fallbackStatuses: [403, 404],
        timeoutMsPrimary: 3000,
      },
    );

    if (!response.ok) {
      throw new Error(`ES Error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Server Action searchFlowRuns error:", error);
    throw new Error("Failed to search flow runs");
  }
}
