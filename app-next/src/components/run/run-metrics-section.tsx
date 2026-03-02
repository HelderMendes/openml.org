"use client";

import { useState, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Evaluation {
  name: string;
  value: string | number;
  stdev?: string | number;
  array_data?: Record<string, string | number>;
  per_fold?: Array<number | number[]>;
}

interface Run {
  output_data?: {
    evaluation?: Evaluation[];
  };
}

interface RunMetricsSectionProps {
  run: Run;
}

// Colors for bar charts
const COLORS = [
  "#3b82f6", // blue
  "#22c55e", // green
  "#f59e0b", // amber
  "#ef4444", // red
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#14b8a6", // teal
  "#f97316", // orange
];

interface ChartEntry {
  fill: string;
  name: string;
  rank?: number;
  total?: number;
  deviation?: number;
}

// Custom tooltip: background = bar color, white text, rank + deviation from mean
function ColoredTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { value: number; payload: ChartEntry }[];
}) {
  if (!active || !payload?.length) return null;
  const { fill, name, rank, total, deviation } = payload[0].payload;
  const val = payload[0].value;
  return (
    <div
      style={{
        backgroundColor: fill,
        padding: "4px 7px",
        borderRadius: 4,
        border: "1px solid white",
        minWidth: 110,
      }}
    >
      <p style={{ color: "white", margin: 0, fontSize: 13, fontWeight: 600 }}>
        {name}
      </p>
      <p style={{ color: "white", margin: 0, fontSize: 13 }}>
        {isNaN(val) ? "N/A" : val.toFixed(4)}
      </p>
      {rank !== undefined && total !== undefined && (
        <p
          style={{
            color: "rgba(255,255,255,0.75)",
            margin: "1px 0 0",
            fontSize: 12,
          }}
        >
          Rank #{rank} of {total}
        </p>
      )}
      {deviation !== undefined && !isNaN(deviation) && (
        <p style={{ color: "rgba(255,255,255,0.75)", margin: 0, fontSize: 12 }}>
          {deviation >= 0 ? "+" : ""}
          {deviation.toFixed(4)} vs avg
        </p>
      )}
    </div>
  );
}

const ITEMS_PER_PAGE = 20;

export function RunMetricsSection({ run }: RunMetricsSectionProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [collapsedMetrics, setCollapsedMetrics] = useState<Set<string>>(
    new Set(),
  );

  const toggleMetric = (name: string) => {
    setCollapsedMetrics((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  // Memoize evaluations to prevent unnecessary re-renders
  const evaluations = useMemo(
    () => run.output_data?.evaluation || [],
    [run.output_data?.evaluation],
  );

  // Filter evaluations based on search term
  const filteredEvaluations = useMemo(() => {
    if (!searchTerm.trim()) return evaluations;
    const term = searchTerm.toLowerCase();
    return evaluations.filter((e) => e.name.toLowerCase().includes(term));
  }, [evaluations, searchTerm]);

  // Pagination
  const totalPages = Math.ceil(filteredEvaluations.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedEvaluations = filteredEvaluations.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  // Reset to page 1 when search changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (evaluations.length === 0) {
    return (
      <div className="text-muted-foreground p-4 text-center text-sm">
        No evaluation metrics available
      </div>
    );
  }

  // Format metric names
  const formatMetricName = (name: string) => {
    const mapping: Record<string, string> = {
      predictive_accuracy: "Predictive Accuracy",
      area_under_roc_curve: "Area Under ROC Curve (AUC)",
      root_mean_squared_error: "Root Mean Squared Error (RMSE)",
      mean_absolute_error: "Mean Absolute Error (MAE)",
      f_measure: "F-Measure",
      precision: "Precision",
      recall: "Recall",
      kappa: "Kappa",
      kb_relative_information_score: "KB Relative Information Score",
      weighted_recall: "Weighted Recall",
    };
    return (
      mapping[name] ||
      name.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase())
    );
  };

  // Convert array_data to chart format — sorted by value desc, with rank + deviation
  const getPerClassChartData = (arrayData: Record<string, string | number>) => {
    const entries = Object.entries(arrayData)
      .map(([key, val], idx) => {
        const numeric = typeof val === "number" ? val : parseFloat(String(val));
        return { name: key, value: numeric, fill: COLORS[idx % COLORS.length] };
      })
      .filter((d) => !isNaN(d.value));
    if (entries.length === 0) return [];
    const mean = entries.reduce((s, e) => s + e.value, 0) / entries.length;
    const sorted = [...entries].sort((a, b) => b.value - a.value);
    return sorted.map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
      total: entries.length,
      deviation: entry.value - mean,
    }));
  };

  // Convert per_fold to chart format — with rank + deviation from fold mean
  const getPerFoldChartData = (perFold: Array<number | number[]>) => {
    const flatValues = perFold.flat();
    const valid = flatValues.filter((v) => !isNaN(v));
    const mean = valid.length
      ? valid.reduce((a, b) => a + b, 0) / valid.length
      : 0;
    const entries = flatValues.map((val, idx) => ({
      name: `Fold ${idx + 1}`,
      value: val,
      fill: "#6b7280",
      deviation: val - mean,
    }));
    const ranked = [...entries].sort((a, b) => b.value - a.value);
    return entries.map((entry) => ({
      ...entry,
      rank: ranked.findIndex((e) => e.name === entry.name) + 1,
      total: entries.length,
    }));
  };

  return (
    <div className="space-y-4">
      {/* Search and pagination controls */}
      {evaluations.length > ITEMS_PER_PAGE && (
        <div className="flex flex-col gap-3 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
            <Input
              type="text"
              placeholder="Search metrics..."
              value={searchTerm}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">
              Showing {startIndex + 1}-
              {Math.min(
                startIndex + ITEMS_PER_PAGE,
                filteredEvaluations.length,
              )}{" "}
              of {filteredEvaluations.length}
              {searchTerm && ` (filtered from ${evaluations.length})`}
            </span>
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-2 text-sm">
                  {currentPage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Metrics list */}
      {paginatedEvaluations.map((evaluation: Evaluation, index: number) => {
        const value = parseFloat(evaluation.value as string);
        const stdev = evaluation.stdev
          ? parseFloat(evaluation.stdev as string)
          : null;
        const arrayData = evaluation.array_data;
        const perFold = evaluation.per_fold;

        const perClassData = arrayData ? getPerClassChartData(arrayData) : null;
        const perFoldData = perFold ? getPerFoldChartData(perFold) : null;

        const hasCharts =
          (perClassData && perClassData.length > 0) ||
          (perFoldData && perFoldData.length > 0);
        const bothCharts =
          perClassData &&
          perClassData.length > 0 &&
          perFoldData &&
          perFoldData.length > 0;
        const isCollapsed = collapsedMetrics.has(evaluation.name);

        return (
          <div
            key={index}
            className={`rounded-lg border px-4 pt-3 pb-2 transition-all duration-150 ${
              hasCharts
                ? "hover:border-slate-400 hover:bg-slate-100/35 hover:shadow-sm"
                : ""
            }`}
          >
            {/* Header row: [chevron] name | value — whole row clickable when charts exist */}
            <div
              className={`flex items-center justify-between gap-3 ${hasCharts ? "cursor-pointer select-none" : ""}`}
              onClick={
                hasCharts ? () => toggleMetric(evaluation.name) : undefined
              }
            >
              {/* Left: rotating chevron indicator + metric name */}
              <div className="flex min-w-0 items-center gap-1.5">
                {hasCharts ? (
                  <ChevronRight
                    className={`text-muted-foreground h-3.5 w-3.5 shrink-0 transition-transform duration-150 ${!isCollapsed ? "rotate-90" : ""}`}
                  />
                ) : (
                  <span className="w-3.5 shrink-0" />
                )}
                <h3 className="text-muted-foreground truncate text-sm font-medium">
                  {formatMetricName(evaluation.name)}
                </h3>
              </div>
              {/* Right: value only — clean, no button */}
              <div className="shrink-0 text-right">
                <span className="text-2xl font-bold">
                  {!isNaN(value) ? value.toFixed(4) : evaluation.value}
                </span>
                {stdev !== null && !isNaN(stdev) && (
                  <span className="text-muted-foreground ml-1 text-sm">
                    ±{stdev.toFixed(4)}
                  </span>
                )}
              </div>
            </div>

            {/* Charts — hidden when collapsed */}
            {!isCollapsed && (
              <>
                {/* Charts row: full-width when only one chart, split when both */}
                <div
                  className={`mt-2 grid grid-cols-1 gap-4 ${bothCharts ? "md:grid-cols-2" : ""}`}
                >
                  {/* Per-class chart */}
                  {perClassData && perClassData.length > 0 && (
                    <div>
                      <h4 className="text-muted-foreground mb-1 text-xs font-medium">
                        Per Class
                      </h4>
                      <div
                        style={{
                          height: Math.max(80, perClassData.length * 18),
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={perClassData}
                            layout="vertical"
                            barSize={10}
                          >
                            <XAxis
                              type="number"
                              domain={[0, "dataMax"]}
                              tick={{ fontSize: 10 }}
                            />
                            <YAxis
                              type="category"
                              dataKey="name"
                              tick={{ fontSize: 10 }}
                              width={60}
                            />
                            <Tooltip content={<ColoredTooltip />} />
                            <Bar dataKey="value" radius={[0, 3, 3, 0]}>
                              {perClassData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Per-fold chart */}
                  {perFoldData && perFoldData.length > 0 && (
                    <div>
                      <h4 className="text-muted-foreground mb-1 text-xs font-medium">
                        Per Fold
                      </h4>
                      <div
                        style={{
                          height: Math.max(100, perFoldData.length * 14 + 40),
                        }}
                      >
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={perFoldData}
                            barSize={14}
                            barCategoryGap={6}
                          >
                            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                            <YAxis
                              tick={{ fontSize: 10 }}
                              domain={[0, "auto"]}
                            />
                            <Tooltip content={<ColoredTooltip />} />
                            <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                              {perFoldData.map((entry, idx) => (
                                <Cell key={`cell-${idx}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                </div>

                {/* Fallback text display if no charts */}
                {!perClassData && !perFoldData && arrayData && (
                  <div className="mt-2 space-y-1 border-t pt-2 text-xs">
                    {Object.entries(arrayData).map(
                      ([key, val]: [string, string | number]) => (
                        <div key={key} className="flex justify-between">
                          <span className="text-muted-foreground">{key}:</span>
                          <span className="font-mono">
                            {typeof val === "number"
                              ? val.toFixed(4)
                              : parseFloat(val).toFixed(4)}
                          </span>
                        </div>
                      ),
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
