import { fetchElasticsearch } from "@/lib/elasticsearch";

export interface StudyData {
  study_id: number;
  study_type: string;
  name: string;
  description?: string;
  uploader?: string;
  uploader_id?: number;
  date?: string;
  visibility?: string;
  datasets_included?: number;
  tasks_included?: number;
  flows_included?: number;
  runs_included?: number;
}

/**
 * Fetch study metadata from Elasticsearch
 */
export async function fetchStudy(id: string): Promise<StudyData> {
  const { response: res } = await fetchElasticsearch(
    `study/_doc/${id}`,
    { next: { revalidate: 3600 } },
    {
      fallbackStatuses: [403, 404],
      timeoutMsPrimary: 3000,
    },
  );

  if (!res.ok) {
    throw new Error(`Study ${id} not found`);
  }

  const data = await res.json();
  if (!data.found || !data._source) {
    throw new Error(`Study ${id} not found`);
  }

  return data._source as StudyData;
}
