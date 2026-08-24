import { NextRequest, NextResponse } from "next/server";
import { fetchElasticsearch } from "@/lib/elasticsearch";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  try {
    const { response } = await fetchElasticsearch(
      "run/_search",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: {
            term: {
              "run_task.source_data.data_id": id,
            },
          },
          size: limit,
          sort: [{ date: { order: "desc" } }],
        }),
      },
      {
        fallbackStatuses: [403, 404],
        timeoutMsPrimary: 3000,
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch runs" },
        { status: response.status },
      );
    }

    const data = await response.json();

    // Transform ES response to match expected format
    const runs =
      data.hits?.hits?.map(
        (hit: { _source: Record<string, unknown> }) => hit._source,
      ) || [];

    return NextResponse.json({ runs });
  } catch (error) {
    console.error("Error fetching runs:", error);
    return NextResponse.json(
      { error: "Failed to fetch runs" },
      { status: 500 },
    );
  }
}
