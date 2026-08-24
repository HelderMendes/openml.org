import { NextRequest, NextResponse } from "next/server";
import { fetchElasticsearch } from "@/lib/elasticsearch";

const USER_INDEX = "user";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    // Query ElasticSearch for user by ID
    const esQuery = {
      query: {
        term: {
          user_id: id,
        },
      },
      size: 1,
    };

    const { response } = await fetchElasticsearch(
      `${USER_INDEX}/_search`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(esQuery),
      },
      {
        fallbackStatuses: [403, 404],
        timeoutMsPrimary: 3000,
      },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to fetch user data" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const hits = data.hits?.hits || [];

    if (hits.length === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = hits[0]._source;

    return NextResponse.json(user);
  } catch (error) {
    console.error("❌ [User API] Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch user data" },
      { status: 500 },
    );
  }
}
