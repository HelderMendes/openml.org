import { NextRequest, NextResponse } from "next/server";
import { fetchElasticsearch } from "@/lib/elasticsearch";

const TASK_INDEX = "task";

interface ElasticsearchHit {
  _source: Record<string, unknown>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const size = parseInt(searchParams.get("size") || "10");
    const sort = searchParams.get("sort") || "date_desc";

    const sortMap: Record<string, object[]> = {
      date_desc: [{ date: { order: "desc" } }],
      runs_desc: [{ runs: { order: "desc" } }],
      name_asc: [{ "name.keyword": { order: "asc" } }],
    };

    const esQuery = {
      query: {
        term: {
          uploader_id: id,
        },
      },
      sort: sortMap[sort] ?? sortMap["date_desc"],
      from: (page - 1) * size,
      size: size,
    };

    const { response } = await fetchElasticsearch(
      `${TASK_INDEX}/_search`,
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
        { error: "Failed to fetch user tasks" },
        { status: 502 },
      );
    }

    const data = await response.json();
    const hits = (data.hits?.hits || []) as ElasticsearchHit[];
    const totalHits = data.hits?.total;
    const total =
      typeof totalHits === "object" ? totalHits.value : totalHits || 0;

    const tasks = hits.map((hit) => hit._source);

    return NextResponse.json({
      tasks,
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    });
  } catch (error) {
    console.error("❌ [User Tasks API] Error:", error);

    return NextResponse.json(
      { error: "Failed to fetch user tasks" },
      { status: 500 },
    );
  }
}
