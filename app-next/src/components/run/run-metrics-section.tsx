"use client";

import { useState, useMemo } from "react";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import MetricItemWithCharts from "./metric-item";

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
      <div className="space-y-4">
        {paginatedEvaluations.map((evaluation) => (
          <MetricItemWithCharts
            key={evaluation.name}
            evaluation={evaluation}
            isCollapsed={collapsedMetrics.has(evaluation.name)}
            onToggle={toggleMetric}
          />
        ))}
      </div>
    </div>
  );
}
