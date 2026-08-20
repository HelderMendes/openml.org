/**
 * Unified Elasticsearch configuration and utility
 */
import { getConfig } from "@/lib/config";

// export const ELASTICSEARCH_URL =
//   process.env.ELASTICSEARCH_URL ||
//   process.env.NEXT_PUBLIC_ELASTICSEARCH_URL ||
//   "https://es.openml.org/";

// Function that reads at runtime
export function getElasticsearchBaseUrl(): string {
  return (
    getConfig("NEXT_PUBLIC_URL_ELASTICSEARCH") ||
    getConfig("ELASTICSEARCH_URL") ||
    getConfig("NEXT_PUBLIC_ELASTICSEARCH_URL") ||
    getConfig("NEXT_PUBLIC_ELASTICSEARCH_SERVER") ||
    // es.openml.org direct access is blocked post-migration; proxy path is the live default
    "https://www.openml.org/es/"
  );
}

export const ELASTICSEARCH_INDICES = [
  "data",
  "task",
  "flow",
  "run",
  "study",
  "measure",
  "benchmark",
  "user",
];

/**
 * Get the full URL for an Elasticsearch endpoint
 */
export function getElasticsearchUrl(path: string): string {
  const ELASTICSEARCH_URL = getElasticsearchBaseUrl();

  const base = ELASTICSEARCH_URL.endsWith("/")
    ? ELASTICSEARCH_URL
    : `${ELASTICSEARCH_URL}/`;
  const cleanPath = path.startsWith("/") ? path.substring(1) : path;
  return `${base}${cleanPath}`;
}
