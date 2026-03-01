"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useMemo } from "react";
import { Loader2, Info } from "lucide-react";
// @ts-ignore
import PCA from "pca-js";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { DatasetFeature } from "@/types/dataset";
import { Skeleton } from "@/components/ui/skeleton";

// Dynamic import for Plotly
const Plot = dynamic(() => import("react-plotly.js"), {
  ssr: false,
  loading: () => <Skeleton className="h-[400px] w-full" />,
});

interface DimensionalityReductionPlotProps {
  datasetId: number | string;
  features: DatasetFeature[];
  preview: { columns: string[]; rows: any[][] } | null;
  isLoading: boolean;
}

export function DimensionalityReductionPlot({
  features,
  preview,
  isLoading,
}: DimensionalityReductionPlotProps) {
  const [pcaResult, setPcaResult] = useState<{
    x: number[];
    y: number[];
    labels: any[];
    hoverText: string[];
    variance: number[];
  } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Identify numeric features vs target (usually the class/label)
  const numericFeatures = useMemo(
    () =>
      features.filter((f) => {
        const t = (f.type || "").toLowerCase();
        return t === "numeric" || t === "real" || t === "integer";
      }),
    [features],
  );

  const targetFeature = useMemo(
    () => features.find((f) => f.target),
    [features],
  );

  useEffect(() => {
    if (!preview || !preview.rows || preview.rows.length === 0 || isLoading) {
      return;
    }

    const processData = async () => {
      setIsProcessing(true);

      // Use a timeout to allow UI to render the loading state
      await new Promise((resolve) => setTimeout(resolve, 100));

      try {
        // 1. Prepare data for PCA
        // Extract only the numeric columns that are NOT the target
        const numericIndices = numericFeatures
          .map((f) => preview.columns.indexOf(f.name))
          .filter((idx) => idx !== -1);

        // Calculate means for each column for simple imputation
        const columnMeans = numericIndices.map((colIdx) => {
          let sum = 0;
          let count = 0;
          for (const row of preview.rows) {
            const val = row[colIdx];
            if (val !== null && val !== undefined && !isNaN(Number(val))) {
              sum += Number(val);
              count++;
            }
          }
          return count > 0 ? sum / count : 0;
        });

        // Use ALL rows, imputing missing values with column mean
        const cleanRows = preview.rows.map((row) => {
          // Create a new row (shallow copy) to avoid mutation if preview is reused
          // Actually map returns new array but row objects might be shared.
          // Since we only read and create derived matrix, we don't need to deep clone row,
          // but we need the values.
          return row;
        });

        // Create the data matrix [features x samples] for pca-js
        // Impute missing values here during matrix construction
        const dataMatrix = numericIndices.map((colIdx, i) =>
          cleanRows.map((row) => {
            const val = row[colIdx];
            if (val === null || val === undefined || isNaN(Number(val))) {
              return columnMeans[i];
            }
            return Number(val);
          }),
        );

        // Check if we have enough variability
        // If dataMatrix is empty or constant, PCA will fail
        if (cleanRows.length < 3 || numericIndices.length < 2) {
          console.warn("Not enough data or dimensions for PCA", {
            rows: cleanRows.length,
            dims: numericIndices.length,
          });
          setIsProcessing(false);
          return;
        }

        // 2. Compute Principal Components
        // Get the first 2 principal components
        const vectors = PCA.getEigenVectors(dataMatrix);

        if (!vectors || vectors.length < 2) {
          console.warn("PCA failed to find at least 2 eigenvectors");
          setIsProcessing(false);
          return;
        }

        const adData = PCA.computeAdjustedData(
          dataMatrix,
          vectors[0],
          vectors[1],
        );

        // Debug output to check structure
        // console.log("PCA Result:", adData);

        if (
          !adData ||
          !adData.adjustedData ||
          !adData.adjustedData[0] ||
          !adData.adjustedData[1]
        ) {
          throw new Error("PCA computation returned invalid data structure");
        }

        // Extract variance explained if available, otherwise use defaults
        const varianceExplained = adData.formattedEigenValues
          ? [adData.formattedEigenValues[0], adData.formattedEigenValues[1]]
          : [0.5, 0.3]; // Fallback if property missing

        // adData.adjustedData[0] is PC1 values for all samples
        // adData.adjustedData[1] is PC2 values for all samples

        // 3. Get labels for coloring (if target exists) and construct hover text
        let labels = [];
        let hoverText = []; // Store richer hover information
        if (targetFeature) {
          const targetIdx = preview.columns.indexOf(targetFeature.name);
          if (targetIdx !== -1) {
            labels = cleanRows.map((row) => row[targetIdx]);
            hoverText = cleanRows.map((row, i) => {
              const targetVal = row[targetIdx];
              return `<b>Row ${i + 1}</b><br>${targetFeature.name}: ${targetVal}`;
            });
          }
        } else {
          hoverText = cleanRows.map((_, i) => `<b>Row ${i + 1}</b>`);
        }

        setPcaResult({
          x: adData.adjustedData[0],
          y: adData.adjustedData[1],
          labels: labels,
          hoverText: hoverText,
          variance: varianceExplained, // Variance explained
        });
      } catch (err) {
        console.error("PCA Calculation failed", err);
      } finally {
        setIsProcessing(false);
      }
    };

    processData();
  }, [preview, numericFeatures, targetFeature, isLoading]);

  if (isLoading || isProcessing) {
    return (
      <div className="bg-muted/10 flex h-[400px] flex-col items-center justify-center gap-4 rounded-lg border">
        <Loader2 className="text-primary h-8 w-8 animate-spin" />
        <p className="text-muted-foreground text-sm">
          Projecting {numericFeatures.length} dimensions into 2D space...
        </p>
      </div>
    );
  }

  if (!pcaResult) {
    return (
      <Alert>
        <Info className="h-4 w-4" />
        <AlertTitle>Insufficient Data</AlertTitle>
        <AlertDescription>
          Not enough numeric data available to generate a projection.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card text-card-foreground rounded-lg border shadow-sm">
        <div className="p-6">
          <div className="mb-4">
            <h3 className="text-lg leading-none font-medium tracking-tight">
              Dimensionality Reduction (PCA)
            </h3>
            <p className="text-muted-foreground mt-1.5 text-sm">
              Visualizing the structural relationship of all{" "}
              {numericFeatures.length} numeric features at once. Similar data
              points appear closer together.
            </p>
          </div>

          <Plot
            data={[
              {
                x: pcaResult.x,
                y: pcaResult.y,
                text: pcaResult.hoverText,
                hovertemplate:
                  "%{text}<br>PC1: %{x:.2f}<br>PC2: %{y:.2f}<extra></extra>",
                mode: "markers",
                type: "scatter",
                marker: {
                  // If we have labels, color by them. Otherwise use a neutral slate.
                  color:
                    pcaResult.labels.length > 0 ? pcaResult.labels : "#94a3b8", // slate-400
                  colorscale: "Viridis",
                  showscale:
                    pcaResult.labels.length > 0 &&
                    typeof pcaResult.labels[0] === "number", // specific handling for numeric targets
                  opacity: 0.8,
                  size: 8,
                  line: {
                    color: "white",
                    width: 0.5,
                  },
                },
                // If discrete labels (strings), plotly handles grouping automatically in legend if we transform data structure,
                // but for simplicity "color" prop on a single trace works for continuous.
                // For discrete, we might want separate traces, but let's stick to simple first.
                transforms:
                  pcaResult.labels.length > 0 &&
                  typeof pcaResult.labels[0] === "string"
                    ? [
                        {
                          type: "groupby",
                          groups: pcaResult.labels,
                        },
                      ]
                    : undefined,
              },
            ]}
            layout={{
              autosize: true,
              height: 500,
              hovermode: "closest",
              margin: { l: 50, r: 20, t: 30, b: 50 },
              xaxis: {
                title: `Principal Component 1`,
                zeroline: false,
                gridcolor: "rgba(128,128,128,0.2)",
              },
              yaxis: {
                title: `Principal Component 2`,
                zeroline: false,
                gridcolor: "rgba(128,128,128,0.2)",
              },
              paper_bgcolor: "transparent",
              plot_bgcolor: "transparent",
              // @ts-ignore
              legend: { orientation: "h", y: -0.2 },
            }}
            useResizeHandler
            className="w-full"
            config={{ displayModeBar: false }}
          />
        </div>
      </div>
    </div>
  );
}
