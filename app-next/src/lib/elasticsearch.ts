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

export type ElasticsearchFetchSource =
  | "modern"
  | "legacy-fallback"
  | "legacy-preferred"
  | "modern-no-legacy";

export type ElasticsearchFetchResult = {
  response: Response;
  source: ElasticsearchFetchSource;
};

type ElasticsearchFetchOptions = {
  legacyPath?: string;
  fallbackStatuses?: number[];
  timeoutMsPrimary?: number;
  timeoutMsLegacy?: number;
};

const DEFAULT_FALLBACK_STATUSES = [403, 404];
const DEFAULT_PRIMARY_TIMEOUT_MS = 3000;
const DEFAULT_LEGACY_TIMEOUT_MS = 4000;
const DEFAULT_LEGACY_PREFER_TTL_MS = 120000;

// In-memory per-process circuit breaker for temporary legacy preference.
const legacyPreferredUntilByIndex = new Map<string, number>();

function isLegacyFallbackEnabled(): boolean {
  return getConfig("OPENML_ES_LEGACY_FALLBACK_ENABLED") !== "false";
}

function getLegacyPreferTtlMs(): number {
  const configured = Number(
    getConfig("OPENML_ES_LEGACY_PREFER_TTL_MS") || DEFAULT_LEGACY_PREFER_TTL_MS,
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_LEGACY_PREFER_TTL_MS;
}

function getPathWithoutLeadingSlash(path: string): string {
  return path.startsWith("/") ? path.substring(1) : path;
}

function getIndexFromPath(path: string): string | null {
  const cleanPath = getPathWithoutLeadingSlash(path);
  const [pathWithoutQuery] = cleanPath.split("?");
  const [index] = pathWithoutQuery.split("/");
  if (!index || index.startsWith("_")) {
    return null;
  }
  return index;
}

export function getLegacyTypedPath(path: string): string | null {
  const cleanPath = getPathWithoutLeadingSlash(path);
  const [pathWithoutQuery] = cleanPath.split("?");
  const parts = pathWithoutQuery.split("/").filter(Boolean);

  if (parts.length < 2) {
    return null;
  }

  const [index, op, ...rest] = parts;
  if (!index || index.startsWith("_")) {
    return null;
  }

  if (op === "_search") {
    return `${index}/${index}/_search?type=${index}`;
  }

  if (op === "_count") {
    return `${index}/${index}/_count?type=${index}`;
  }

  if (op === "_doc" && rest.length > 0) {
    return `${index}/${index}/${rest.join("/")}`;
  }

  if (op === "_mget") {
    return `${index}/${index}/_mget?type=${index}`;
  }

  return null;
}

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchElasticsearch(
  path: string,
  init: RequestInit = {},
  options: ElasticsearchFetchOptions = {},
): Promise<ElasticsearchFetchResult> {
  const legacyEnabled = isLegacyFallbackEnabled();
  const fallbackStatuses =
    options.fallbackStatuses && options.fallbackStatuses.length > 0
      ? options.fallbackStatuses
      : DEFAULT_FALLBACK_STATUSES;
  const timeoutMsPrimary =
    options.timeoutMsPrimary ||
    Number(getConfig("OPENML_ES_PRIMARY_TIMEOUT_MS")) ||
    DEFAULT_PRIMARY_TIMEOUT_MS;
  const timeoutMsLegacy =
    options.timeoutMsLegacy ||
    Number(getConfig("OPENML_ES_LEGACY_TIMEOUT_MS")) ||
    DEFAULT_LEGACY_TIMEOUT_MS;

  const index = getIndexFromPath(path);
  const preferredUntil = index
    ? legacyPreferredUntilByIndex.get(index) || 0
    : 0;
  const legacyPath = options.legacyPath || getLegacyTypedPath(path);
  const canTryLegacy = legacyEnabled && !!legacyPath;

  const modernUrl = getElasticsearchUrl(path);
  const legacyUrl = legacyPath ? getElasticsearchUrl(legacyPath) : null;

  if (canTryLegacy && legacyUrl && Date.now() < preferredUntil) {
    const legacyFirst = await fetchWithTimeout(
      legacyUrl,
      init,
      timeoutMsLegacy,
    );
    if (legacyFirst.ok) {
      return { response: legacyFirst, source: "legacy-preferred" };
    }
  }

  let modernResponse: Response;
  try {
    modernResponse = await fetchWithTimeout(modernUrl, init, timeoutMsPrimary);
  } catch (error) {
    if (canTryLegacy && legacyUrl) {
      const legacyFallback = await fetchWithTimeout(
        legacyUrl,
        init,
        timeoutMsLegacy,
      );
      if (legacyFallback.ok) {
        if (index) {
          legacyPreferredUntilByIndex.set(
            index,
            Date.now() + getLegacyPreferTtlMs(),
          );
        }
        return { response: legacyFallback, source: "legacy-fallback" };
      }
    }
    throw error;
  }

  if (modernResponse.ok) {
    if (index) {
      legacyPreferredUntilByIndex.delete(index);
    }
    return {
      response: modernResponse,
      source: legacyPath ? "modern" : "modern-no-legacy",
    };
  }

  if (
    canTryLegacy &&
    legacyUrl &&
    fallbackStatuses.includes(modernResponse.status)
  ) {
    const legacyFallback = await fetchWithTimeout(
      legacyUrl,
      init,
      timeoutMsLegacy,
    );
    if (legacyFallback.ok) {
      if (index) {
        legacyPreferredUntilByIndex.set(
          index,
          Date.now() + getLegacyPreferTtlMs(),
        );
      }
      return { response: legacyFallback, source: "legacy-fallback" };
    }
  }

  return {
    response: modernResponse,
    source: legacyPath ? "modern" : "modern-no-legacy",
  };
}
