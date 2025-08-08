"use client";

import React from "react";
import { Line, Bar, Pie, Doughnut, Scatter } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ScatterController,
);

export type ChartType =
  | "line"
  | "bar"
  | "pie"
  | "doughnut"
  | "scatter"
  | "area";

export interface ChartDataset {
  label: string;
  data: number[] | Array<{ x: number; y: number }>;
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartTheme {
  background: string;
  text: string;
  grid: string;
  primary: string;
  secondary: string;
  accent: string[];
}

export interface GrowthChartProps {
  // Data props
  labels: string[];
  datasets: ChartDataset[];

  // Chart configuration
  type?: ChartType;
  title?: string;
  subtitle?: string;

  // Styling
  theme?: "light" | "dark" | "auto";
  width?: number;
  height?: number;
  className?: string;

  // Chart options
  showLegend?: boolean;
  legendPosition?: "top" | "bottom" | "left" | "right";
  showGrid?: boolean;
  showTooltips?: boolean;
  animation?: boolean;
  responsive?: boolean;
  maintainAspectRatio?: boolean;

  // Axis options
  xAxisTitle?: string;
  yAxisTitle?: string;
  xAxisDisplay?: boolean;
  yAxisDisplay?: boolean;
  yAxisBeginAtZero?: boolean;
  yAxisMax?: number;
  yAxisMin?: number;

  // Format options
  valueFormatter?: (value: number) => string;
  labelFormatter?: (label: string, index: number) => string;

  // Events
  onChartClick?: (event: any, elements: any[]) => void;
  onHover?: (event: any, elements: any[]) => void;

  // Legacy props for backward compatibility
  currentFollowers?: number;
  weeklyGrowth?: number;
}

const CHART_THEMES: Record<string, ChartTheme> = {
  light: {
    background: "#ffffff",
    text: "#1f2937",
    grid: "#e5e7eb",
    primary: "#4f46e5",
    secondary: "#06b6d4",
    accent: [
      "#4f46e5",
      "#06b6d4",
      "#10b981",
      "#f59e0b",
      "#ef4444",
      "#8b5cf6",
      "#6b7280",
    ],
  },
  dark: {
    background: "#1f2937",
    text: "#f3f4f6",
    grid: "#374151",
    primary: "#6366f1",
    secondary: "#22d3ee",
    accent: [
      "#6366f1",
      "#22d3ee",
      "#34d399",
      "#fbbf24",
      "#f87171",
      "#a78bfa",
      "#9ca3af",
    ],
  },
};

const DEFAULT_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#6b7280",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#84cc16",
  "#6366f1",
  "#8b5cf6",
];

export default function GrowthChart({
  // Data props
  labels = [],
  datasets = [],

  // Chart configuration
  type = "line",
  title,
  subtitle,

  // Styling
  theme = "dark",
  width,
  height = 400,
  className = "",

  // Chart options
  showLegend = true,
  legendPosition = "top",
  showGrid = true,
  showTooltips = true,
  animation = true,
  responsive = true,
  maintainAspectRatio = false,

  // Axis options
  xAxisTitle,
  yAxisTitle,
  xAxisDisplay = true,
  yAxisDisplay = true,
  yAxisBeginAtZero = true,
  yAxisMax,
  yAxisMin,

  // Format options
  valueFormatter,
  labelFormatter,

  // Events
  onChartClick,
  onHover,

  // Legacy props
  currentFollowers,
  weeklyGrowth,
}: GrowthChartProps) {
  // Handle legacy props - convert to new format
  const processedData = React.useMemo(() => {
    if (currentFollowers !== undefined && weeklyGrowth !== undefined) {
      // Legacy mode: generate follower growth data
      const weeksToShow = 12;
      const generatedLabels = Array.from({ length: weeksToShow + 1 }, (_, i) =>
        i === weeksToShow ? "Now" : `${weeksToShow - i}w ago`,
      );

      const generatedData = Array.from({ length: weeksToShow }, (_, i) => {
        const weekNumber = weeksToShow - i;
        return Math.max(0, currentFollowers - weeklyGrowth * (i + 1));
      }).reverse();
      generatedData.push(currentFollowers);

      return {
        labels: generatedLabels,
        datasets: [
          {
            label: "Followers",
            data: generatedData,
            borderColor: CHART_THEMES[theme].primary,
            backgroundColor: `${CHART_THEMES[theme].primary}20`,
            tension: 0.4,
            fill: type === "area",
          },
        ],
      };
    }

    return { labels, datasets };
  }, [labels, datasets, currentFollowers, weeklyGrowth, type, theme]);

  // Auto-detect theme based on system preference
  const [resolvedTheme, setResolvedTheme] = React.useState(theme);

  React.useEffect(() => {
    if (theme === "auto") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setResolvedTheme(mediaQuery.matches ? "dark" : "light");

      const handleChange = (e: MediaQueryListEvent) => {
        setResolvedTheme(e.matches ? "dark" : "light");
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    } else {
      setResolvedTheme(theme);
    }
  }, [theme]);

  const currentTheme = CHART_THEMES[resolvedTheme];

  // Format value helper
  const formatValue =
    valueFormatter ||
    ((value: number) => {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      }
      if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString();
    });

  // Process datasets with theme colors
  const processedDatasets = React.useMemo(() => {
    return processedData.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor ||
        (type === "pie" || type === "doughnut"
          ? currentTheme.accent
          : `${currentTheme.accent[index % currentTheme.accent.length]}${type === "bar" ? "80" : "20"}`),
      borderColor:
        dataset.borderColor ||
        currentTheme.accent[index % currentTheme.accent.length],
      borderWidth: dataset.borderWidth || (type === "line" ? 3 : 1),
      fill: dataset.fill !== undefined ? dataset.fill : type === "area",
      tension:
        dataset.tension !== undefined
          ? dataset.tension
          : type === "line" || type === "area"
            ? 0.4
            : 0,
      pointRadius:
        dataset.pointRadius !== undefined
          ? dataset.pointRadius
          : type === "line"
            ? 4
            : 0,
      pointHoverRadius:
        dataset.pointHoverRadius !== undefined
          ? dataset.pointHoverRadius
          : type === "line"
            ? 6
            : 0,
    }));
  }, [processedData.datasets, type, currentTheme]);

  const chartData = {
    labels: processedData.labels.map((label, index) =>
      labelFormatter ? labelFormatter(label, index) : label,
    ),
    datasets: processedDatasets,
  };

  const chartOptions = {
    responsive,
    maintainAspectRatio,
    animation: animation ? undefined : false,
    plugins: {
      title: {
        display: !!(title || subtitle),
        text: title,
        color: currentTheme.text,
        font: {
          size: 18,
          weight: "bold" as const,
        },
        padding: {
          bottom: subtitle ? 10 : 20,
        },
      },
      subtitle: {
        display: !!subtitle,
        text: subtitle,
        color: currentTheme.text,
        font: {
          size: 14,
        },
        padding: {
          bottom: 20,
        },
      },
      legend: {
        display: showLegend && processedDatasets.length > 1,
        position: legendPosition,
        labels: {
          color: currentTheme.text,
          padding: 20,
          usePointStyle: true,
        },
      },
      tooltip: {
        enabled: showTooltips,
        mode: "index" as const,
        intersect: false,
        backgroundColor: currentTheme.background,
        titleColor: currentTheme.text,
        bodyColor: currentTheme.text,
        borderColor: currentTheme.grid,
        borderWidth: 1,
        callbacks: {
          label: (context: any) => {
            const value = context.parsed.y ?? context.parsed;
            return `${context.dataset.label}: ${formatValue(value)}`;
          },
        },
      },
    },
    scales:
      type !== "pie" && type !== "doughnut"
        ? {
            x: {
              display: xAxisDisplay,
              title: {
                display: !!xAxisTitle,
                text: xAxisTitle,
                color: currentTheme.text,
                font: {
                  size: 14,
                  weight: "bold" as const,
                },
              },
              grid: {
                display: showGrid,
                color: currentTheme.grid,
              },
              ticks: {
                color: currentTheme.text,
                maxRotation: 45,
                minRotation: 0,
              },
            },
            y: {
              display: yAxisDisplay,
              beginAtZero: yAxisBeginAtZero,
              max: yAxisMax,
              min: yAxisMin,
              title: {
                display: !!yAxisTitle,
                text: yAxisTitle,
                color: currentTheme.text,
                font: {
                  size: 14,
                  weight: "bold" as const,
                },
              },
              grid: {
                display: showGrid,
                color: currentTheme.grid,
              },
              ticks: {
                color: currentTheme.text,
                callback: (value: any) => formatValue(value),
              },
            },
          }
        : {},
    onClick: onChartClick,
    onHover,
    interaction: {
      mode: "nearest" as const,
      axis: "x" as const,
      intersect: false,
    },
  };

  const containerStyle: React.CSSProperties = {
    width: width || "100%",
    height: height,
    backgroundColor: currentTheme.background,
    padding: "1rem",
    borderRadius: "0.5rem",
    border: `1px solid ${currentTheme.grid}`,
  };

  const ChartComponent = React.useMemo(() => {
    switch (type) {
      case "bar":
        return Bar;
      case "pie":
        return Pie;
      case "doughnut":
        return Doughnut;
      case "scatter":
        return Scatter;
      case "line":
      case "area":
      default:
        return Line;
    }
  }, [type]);

  if (!chartData.labels.length || !chartData.datasets.length) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={containerStyle}
      >
        <div className="text-center" style={{ color: currentTheme.text }}>
          <div className="text-2xl mb-2">📊</div>
          <div className="text-sm opacity-75">No data available</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`${className}`} style={containerStyle}>
      <ChartComponent data={chartData} options={chartOptions} />
    </div>
  );
}

// Convenience components for specific chart types
export function LineChart(props: Omit<GrowthChartProps, "type">) {
  return <GrowthChart {...props} type="line" />;
}

export function BarChart(props: Omit<GrowthChartProps, "type">) {
  return <GrowthChart {...props} type="bar" />;
}

export function PieChart(props: Omit<GrowthChartProps, "type">) {
  return <GrowthChart {...props} type="pie" />;
}

export function DoughnutChart(props: Omit<GrowthChartProps, "type">) {
  return <GrowthChart {...props} type="doughnut" />;
}

export function AreaChart(props: Omit<GrowthChartProps, "type">) {
  return <GrowthChart {...props} type="area" />;
}

export function ScatterChart(props: Omit<GrowthChartProps, "type">) {
  return <GrowthChart {...props} type="scatter" />;
}

// Legacy component for backward compatibility
export function FollowerGrowthGraph({
  currentFollowers,
  weeklyGrowth,
}: {
  currentFollowers: number;
  weeklyGrowth: number;
}) {
  return (
    <div className="border border-gray-800 p-6">
      <h3 className="font-bold mb-4 text-white">
        Follower Growth (Last 12 Weeks)
      </h3>
      <div className="h-64">
        <GrowthChart
          labels={[]}
          datasets={[]}
          currentFollowers={currentFollowers}
          weeklyGrowth={weeklyGrowth}
          type="area"
          theme="dark"
          height={256}
          showLegend={false}
          title=""
          yAxisTitle="Followers"
          valueFormatter={(value) => {
            if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
            if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
            return value.toString();
          }}
        />
      </div>
    </div>
  );
}

// Usage Examples and Documentation
export const ChartExamples = {
  // Basic bar chart
  basicBar: {
    labels: ["Jan", "Feb", "Mar", "Apr", "May"],
    datasets: [
      {
        label: "Sales",
        data: [12, 19, 3, 5, 2],
      },
    ],
    type: "bar" as ChartType,
    title: "Monthly Sales",
  },

  // Multi-dataset line chart
  multiLine: {
    labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
    datasets: [
      {
        label: "Instagram",
        data: [1000, 1200, 1100, 1400],
        borderColor: "#E1306C",
        backgroundColor: "#E1306C20",
      },
      {
        label: "TikTok",
        data: [800, 950, 1050, 1200],
        borderColor: "#000000",
        backgroundColor: "#00000020",
      },
    ],
    type: "line" as ChartType,
    title: "Platform Growth Comparison",
    yAxisTitle: "Followers",
  },

  // Pie chart distribution
  pieDistribution: {
    labels: ["Soccer", "Basketball", "Tennis", "Baseball", "Football"],
    datasets: [
      {
        label: "Sports Distribution",
        data: [30, 25, 15, 20, 10],
      },
    ],
    type: "pie" as ChartType,
    title: "Sports Popularity Distribution",
  },

  // Area chart with trend
  areaTrend: {
    labels: ["Q1", "Q2", "Q3", "Q4"],
    datasets: [
      {
        label: "Revenue Growth",
        data: [100000, 150000, 200000, 280000],
        backgroundColor: "#10B98130",
        borderColor: "#10B981",
        fill: true,
      },
    ],
    type: "area" as ChartType,
    title: "Quarterly Revenue Trend",
    valueFormatter: (value: number) => `$${(value / 1000).toFixed(0)}K`,
  },

  // Scatter plot correlation
  scatterCorrelation: {
    labels: [],
    datasets: [
      {
        label: "Engagement vs Followers",
        data: [
          { x: 1000, y: 50 },
          { x: 2000, y: 80 },
          { x: 5000, y: 120 },
          { x: 10000, y: 200 },
          { x: 15000, y: 250 },
        ] as any,
      },
    ],
    type: "scatter" as ChartType,
    title: "Engagement Rate vs Follower Count",
    xAxisTitle: "Followers",
    yAxisTitle: "Engagement Rate (%)",
  },
};

/**
 * Example usage components demonstrating different chart configurations
 */
export function ChartShowcase() {
  return (
    <div className="space-y-8 p-6">
      <h2 className="text-2xl font-bold text-white mb-6">Chart Examples</h2>

      {/* Basic Bar Chart */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Basic Bar Chart
        </h3>
        <GrowthChart {...ChartExamples.basicBar} theme="dark" height={300} />
      </div>

      {/* Multi-Line Chart */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Multi-Dataset Line Chart
        </h3>
        <GrowthChart {...ChartExamples.multiLine} theme="dark" height={300} />
      </div>

      {/* Pie Chart */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Pie Chart Distribution
        </h3>
        <GrowthChart
          {...ChartExamples.pieDistribution}
          theme="dark"
          height={300}
        />
      </div>

      {/* Area Chart */}
      <div>
        <h3 className="text-lg font-semibold text-white mb-2">
          Area Chart Trend
        </h3>
        <GrowthChart {...ChartExamples.areaTrend} theme="dark" height={300} />
      </div>
    </div>
  );
}

/**
 * Advanced chart configuration examples
 */
export const AdvancedChartExamples = {
  // Dark theme with custom colors
  darkThemeChart: (
    <GrowthChart
      labels={["Product A", "Product B", "Product C", "Product D"]}
      datasets={[
        {
          label: "Q1 Sales",
          data: [45, 32, 67, 89],
          backgroundColor: "#6366F1",
        },
        {
          label: "Q2 Sales",
          data: [52, 38, 71, 95],
          backgroundColor: "#22D3EE",
        },
      ]}
      type="bar"
      theme="dark"
      title="Quarterly Product Sales"
      subtitle="Comparison across product lines"
      showLegend={true}
      legendPosition="bottom"
      yAxisTitle="Sales (Units)"
      xAxisTitle="Products"
      valueFormatter={(value) => `${value} units`}
      height={400}
    />
  ),

  // Interactive chart with events
  interactiveChart: (
    <GrowthChart
      labels={["Jan", "Feb", "Mar", "Apr", "May", "Jun"]}
      datasets={[
        {
          label: "Website Traffic",
          data: [1200, 1900, 3000, 5000, 2000, 3000],
          borderColor: "#10B981",
          backgroundColor: "#10B98120",
        },
      ]}
      type="line"
      theme="light"
      title="Website Traffic Over Time"
      onChartClick={(event, elements) => {
        if (elements.length > 0) {
          console.log("Clicked on data point:", elements[0]);
        }
      }}
      onHover={(event, elements) => {
        if (elements.length > 0) {
          console.log("Hovering over:", elements[0]);
        }
      }}
      animation={true}
      showGrid={true}
      height={350}
    />
  ),

  // Custom styled doughnut chart
  customDoughnutChart: (
    <GrowthChart
      labels={["Desktop", "Mobile", "Tablet", "Other"]}
      datasets={[
        {
          label: "Device Usage",
          data: [45, 35, 15, 5],
          backgroundColor: ["#4F46E5", "#06B6D4", "#10B981", "#F59E0B"],
          borderColor: ["#4338CA", "#0891B2", "#059669", "#D97706"],
        },
      ]}
      type="doughnut"
      theme="light"
      title="Device Usage Distribution"
      showLegend={true}
      legendPosition="right"
      height={300}
      width={500}
    />
  ),
};

/**
 * Utility functions for chart data processing
 */
export const ChartUtils = {
  // Generate time series data
  generateTimeSeriesData: (
    startValue: number,
    periods: number,
    growthRate: number = 0.1,
    volatility: number = 0.2,
  ) => {
    const data = [startValue];
    for (let i = 1; i < periods; i++) {
      const growth = 1 + growthRate + (Math.random() - 0.5) * volatility;
      data.push(Math.round(data[i - 1] * growth));
    }
    return data;
  },

  // Generate date labels
  generateDateLabels: (
    startDate: Date,
    periods: number,
    interval: "day" | "week" | "month" = "month",
  ) => {
    const labels = [];
    const current = new Date(startDate);

    for (let i = 0; i < periods; i++) {
      labels.push(
        current.toLocaleDateString("en-US", {
          month: "short",
          ...(interval === "day" && { day: "numeric" }),
          ...(interval !== "day" && { year: "2-digit" }),
        }),
      );

      switch (interval) {
        case "day":
          current.setDate(current.getDate() + 1);
          break;
        case "week":
          current.setDate(current.getDate() + 7);
          break;
        case "month":
          current.setMonth(current.getMonth() + 1);
          break;
      }
    }

    return labels;
  },

  // Convert data to percentage distribution
  toPercentageDistribution: (data: number[]) => {
    const total = data.reduce((sum, value) => sum + value, 0);
    return data.map((value) => Math.round((value / total) * 100));
  },

  // Calculate moving average
  calculateMovingAverage: (data: number[], windowSize: number = 3) => {
    const result = [];
    for (let i = 0; i < data.length; i++) {
      const start = Math.max(0, i - Math.floor(windowSize / 2));
      const end = Math.min(data.length, i + Math.ceil(windowSize / 2));
      const window = data.slice(start, end);
      const average = window.reduce((sum, val) => sum + val, 0) / window.length;
      result.push(Math.round(average));
    }
    return result;
  },

  // Generate comparison datasets
  generateComparisonData: (
    baseData: number[],
    comparisonLabel: string,
    variationPercent: number = 20,
  ) => {
    return baseData.map((value) => {
      const variation = (Math.random() - 0.5) * 2 * (variationPercent / 100);
      return Math.round(value * (1 + variation));
    });
  },
};

/**
 * Performance optimization hooks for large datasets
 */
export const useOptimizedChart = (
  data: { labels: string[]; datasets: ChartDataset[] },
  maxDataPoints: number = 50,
) => {
  return React.useMemo(() => {
    if (data.labels.length <= maxDataPoints) {
      return data;
    }

    // Sample data points evenly
    const step = Math.ceil(data.labels.length / maxDataPoints);
    const sampledLabels = data.labels.filter((_, index) => index % step === 0);
    const sampledDatasets = data.datasets.map((dataset) => ({
      ...dataset,
      data: (dataset.data as number[]).filter((_, index) => index % step === 0),
    }));

    return {
      labels: sampledLabels,
      datasets: sampledDatasets,
    };
  }, [data, maxDataPoints]);
};

/**
 * Chart configuration presets for common use cases
 */
export const ChartPresets = {
  analytics: {
    theme: "dark" as const,
    showGrid: true,
    showLegend: true,
    legendPosition: "top" as const,
    animation: false,
    responsive: true,
    height: 400,
  },

  dashboard: {
    theme: "light" as const,
    showGrid: false,
    showLegend: false,
    animation: true,
    responsive: true,
    height: 250,
  },

  presentation: {
    theme: "light" as const,
    showGrid: true,
    showLegend: true,
    legendPosition: "bottom" as const,
    animation: true,
    responsive: true,
    height: 500,
  },

  mobile: {
    theme: "auto" as const,
    showGrid: false,
    showLegend: true,
    legendPosition: "bottom" as const,
    animation: false,
    responsive: true,
    height: 300,
    maintainAspectRatio: false,
  },
};
