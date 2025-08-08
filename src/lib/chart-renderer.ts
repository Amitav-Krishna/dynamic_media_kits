// lib/chart-renderer.ts
import { ChartConfiguration, ChartType } from "chart.js";
import {
  SimpleChartRenderer,
  convertToSimpleChartData,
  SimpleChartData,
} from "./simple-chart-renderer";

// Lazy loading variables
let ChartJSNodeCanvas: any = null;
let canvasAvailable = false;
let canvasInitialized = false;

// Lazy initialize canvas functionality
async function initializeCanvas() {
  if (canvasInitialized) {
    return canvasAvailable;
  }

  try {
    // Only try to import in Node.js environment, not in browser/edge runtime
    if (typeof window === 'undefined' && typeof process !== 'undefined' && process.versions?.node) {
      const chartModule = await import("chartjs-node-canvas");
      ChartJSNodeCanvas = chartModule.ChartJSNodeCanvas;
      canvasAvailable = true;
      console.log("ChartJS Node Canvas available");
    } else {
      console.log("Not in Node.js environment, using SVG fallback");
      canvasAvailable = false;
    }
  } catch (error) {
    console.warn(
      "ChartJS Node Canvas not available, using SVG fallback:",
      error.message,
    );
    canvasAvailable = false;
  }

  canvasInitialized = true;
  return canvasAvailable;
}

export interface ChartDataset {
  label: string;
  data: number[];
  backgroundColor?: string | string[];
  borderColor?: string | string[];
  borderWidth?: number;
  fill?: boolean;
  tension?: number;
  pointRadius?: number;
  pointHoverRadius?: number;
}

export interface ChartOptions {
  title?: string;
  subtitle?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  theme?: "light" | "dark";
  legend?: {
    display: boolean;
    position?: "top" | "bottom" | "left" | "right";
  };
  grid?: {
    display: boolean;
    color?: string;
  };
  scales?: {
    x?: {
      display: boolean;
      title?: string;
      grid?: boolean;
    };
    y?: {
      display: boolean;
      title?: string;
      grid?: boolean;
      beginAtZero?: boolean;
      max?: number;
      min?: number;
    };
  };
  animation?: boolean;
  responsive?: boolean;
}

export interface ChartData {
  type: ChartType;
  labels: string[];
  datasets: ChartDataset[];
  options?: ChartOptions;
}

const DEFAULT_COLORS = {
  primary: "#4F46E5",
  secondary: "#06B6D4",
  success: "#10B981",
  warning: "#F59E0B",
  error: "#EF4444",
  info: "#8B5CF6",
  neutral: "#6B7280",
};

const CHART_COLORS = [
  DEFAULT_COLORS.primary,
  DEFAULT_COLORS.secondary,
  DEFAULT_COLORS.success,
  DEFAULT_COLORS.warning,
  DEFAULT_COLORS.error,
  DEFAULT_COLORS.info,
  DEFAULT_COLORS.neutral,
];

export class ChartRenderer {
  private canvas: any = null;
  private defaultOptions: ChartOptions;

  constructor(options: Partial<ChartOptions> = {}) {
    this.defaultOptions = {
      width: 800,
      height: 600,
      backgroundColor: "#ffffff",
      theme: "light",
      legend: { display: true, position: "top" },
      grid: { display: true },
      scales: {
        x: { display: true, grid: true },
        y: { display: true, grid: true, beginAtZero: true },
      },
      animation: false,
      responsive: true,
      ...options,
    };
  }

  private async initializeCanvasInstance(): Promise<boolean> {
    const available = await initializeCanvas();

    if (available && ChartJSNodeCanvas && !this.canvas) {
      try {
        this.canvas = new ChartJSNodeCanvas({
          width: this.defaultOptions.width!,
          height: this.defaultOptions.height!,
          backgroundColour: this.defaultOptions.backgroundColor!,
          plugins: {
            modern: [],
          },
        });
        return true;
      } catch (error) {
        console.error("Failed to create canvas instance:", error);
        this.canvas = null;
        return false;
      }
    }

    return available;
  }

  private applyTheme(
    config: ChartConfiguration,
    theme: "light" | "dark",
  ): void {
    const isDark = theme === "dark";
    const textColor = isDark ? "#F3F4F6" : "#1F2937";
    const gridColor = isDark ? "#374151" : "#E5E7EB";
    const backgroundColor = isDark ? "#1F2937" : "#ffffff";

    // Update canvas background if canvas is available
    if (ChartJSNodeCanvas && this.canvas) {
      try {
        this.canvas = new ChartJSNodeCanvas({
          width: this.defaultOptions.width!,
          height: this.defaultOptions.height!,
          backgroundColour: backgroundColor,
          plugins: { modern: [] },
        });
      } catch (error) {
        console.warn("Failed to update canvas background:", error);
      }
    }

    // Apply theme colors to chart config
    if (config.options) {
      if (config.options.plugins?.title) {
        config.options.plugins.title.color = textColor;
      }
      if (config.options.plugins?.legend) {
        config.options.plugins.legend.labels = {
          ...config.options.plugins.legend.labels,
          color: textColor,
        };
      }
      if (config.options.scales) {
        Object.keys(config.options.scales).forEach((scaleKey) => {
          const scale = (config.options!.scales as any)[scaleKey];
          if (scale) {
            scale.ticks = { ...scale.ticks, color: textColor };
            scale.grid = { ...scale.grid, color: gridColor };
            if (scale.title) {
              scale.title.color = textColor;
            }
          }
        });
      }
    }
  }

  private generateConfiguration(data: ChartData): ChartConfiguration {
    const mergedOptions = { ...this.defaultOptions, ...data.options };

    // Auto-assign colors if not provided
    const datasets = data.datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor:
        dataset.backgroundColor ||
        this.getBackgroundColor(
          data.type,
          CHART_COLORS[index % CHART_COLORS.length],
        ),
      borderColor:
        dataset.borderColor || CHART_COLORS[index % CHART_COLORS.length],
      borderWidth: dataset.borderWidth || (data.type === "line" ? 3 : 1),
      fill:
        dataset.fill !== undefined
          ? dataset.fill
          : (data.type as string) === "area",
      tension: dataset.tension || (data.type === "line" ? 0.4 : 0),
      pointRadius: dataset.pointRadius || (data.type === "line" ? 4 : 0),
      pointHoverRadius:
        dataset.pointHoverRadius || (data.type === "line" ? 6 : 0),
    }));

    const config: ChartConfiguration = {
      type: data.type as any,
      data: {
        labels: data.labels,
        datasets: datasets as any,
      },
      options: {
        responsive: mergedOptions.responsive,
        plugins: {
          title: {
            display: !!(mergedOptions.title || mergedOptions.subtitle),
            text: mergedOptions.title,
            font: { size: 20, weight: "bold" },
            padding: { bottom: 20 },
          },
          subtitle: {
            display: !!mergedOptions.subtitle,
            text: mergedOptions.subtitle,
            font: { size: 14 },
            padding: { bottom: 10 },
          },
          legend: {
            display: mergedOptions.legend?.display ?? true,
            position: mergedOptions.legend?.position || "top",
            labels: {
              padding: 20,
              usePointStyle: true,
            },
          },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (context: any) => {
                const value = context.parsed.y || context.parsed;
                return `${context.dataset.label}: ${this.formatValue(value)}`;
              },
            },
          },
        },
        scales: this.generateScales(data.type, mergedOptions),
        interaction: {
          mode: "nearest",
          axis: "x",
          intersect: false,
        },
        animation: mergedOptions.animation ? undefined : false,
      },
    };

    // Apply theme
    if (mergedOptions.theme) {
      this.applyTheme(config, mergedOptions.theme);
    }

    return config;
  }

  private generateScales(chartType: ChartType, options: ChartOptions): any {
    if (["pie", "doughnut", "polarArea"].includes(chartType)) {
      return {}; // No scales for circular charts
    }

    const scales: any = {};

    if (options.scales?.x?.display !== false) {
      scales.x = {
        display: options.scales?.x?.display ?? true,
        grid: {
          display: options.scales?.x?.grid ?? options.grid?.display ?? true,
          color: options.grid?.color,
        },
        title: {
          display: !!options.scales?.x?.title,
          text: options.scales?.x?.title,
          font: { size: 14, weight: "bold" },
        },
        ticks: {
          maxRotation: 45,
          minRotation: 0,
        },
      };
    }

    if (options.scales?.y?.display !== false) {
      scales.y = {
        display: options.scales?.y?.display ?? true,
        beginAtZero: options.scales?.y?.beginAtZero ?? true,
        max: options.scales?.y?.max,
        min: options.scales?.y?.min,
        grid: {
          display: options.scales?.y?.grid ?? options.grid?.display ?? true,
          color: options.grid?.color,
        },
        title: {
          display: !!options.scales?.y?.title,
          text: options.scales?.y?.title,
          font: { size: 14, weight: "bold" },
        },
        ticks: {
          callback: (value: any) => this.formatValue(value),
        },
      };
    }

    return scales;
  }

  private getBackgroundColor(
    chartType: ChartType,
    color: string,
  ): string | string[] {
    if (["pie", "doughnut", "polarArea"].includes(chartType)) {
      return CHART_COLORS;
    }

    if (chartType === "bar") {
      return color + "80"; // Add transparency
    }

    return color + "20"; // Light transparency for area charts
  }

  private formatValue(value: number): string {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    }
    if (value >= 1000) {
      return `${(value / 1000).toFixed(1)}K`;
    }
    return value.toLocaleString();
  }

  async renderChart(chartData: ChartData): Promise<string> {
    // Try to initialize canvas
    const canvasReady = await this.initializeCanvasInstance();

    // If canvas is available and ready, use it
    if (canvasReady && this.canvas) {
      try {
        const config = this.generateConfiguration(chartData);
        const buffer = await this.canvas.renderToBuffer(config);
        return buffer.toString("base64");
      } catch (error) {
        console.error(
          "Canvas chart rendering failed, falling back to SVG:",
          error,
        );
      }
    }

    // Fallback to simple SVG renderer
    console.log("Using SVG fallback for chart rendering");
    return this.renderWithSVGFallback(chartData);
  }

  private async renderWithSVGFallback(chartData: ChartData): Promise<string> {
    const simpleRenderer = new SimpleChartRenderer();

    // Convert ChartData to SimpleChartData
    const simpleChartData = convertToSimpleChartData(
      chartData.labels,
      chartData.datasets,
      chartData.type as any,
      chartData.options?.title,
    );

    const options = {
      width: this.defaultOptions.width,
      height: this.defaultOptions.height,
      theme: this.defaultOptions.theme === "dark" ? "dark" : "light",
      showValues: true,
    };

    return simpleRenderer.renderChart(simpleChartData, options);
  }

  // Convenience methods for common chart types
  async renderBarChart(
    labels: string[],
    datasets: ChartDataset[],
    options?: ChartOptions,
  ): Promise<string> {
    return this.renderChart({
      type: "bar",
      labels,
      datasets,
      options,
    });
  }

  async renderLineChart(
    labels: string[],
    datasets: ChartDataset[],
    options?: ChartOptions,
  ): Promise<string> {
    return this.renderChart({
      type: "line",
      labels,
      datasets,
      options,
    });
  }

  async renderPieChart(
    labels: string[],
    data: number[],
    options?: ChartOptions,
  ): Promise<string> {
    return this.renderChart({
      type: "pie",
      labels,
      datasets: [
        {
          label: "Data",
          data,
          backgroundColor: CHART_COLORS,
        },
      ],
      options,
    });
  }

  async renderDoughnutChart(
    labels: string[],
    data: number[],
    options?: ChartOptions,
  ): Promise<string> {
    return this.renderChart({
      type: "doughnut",
      labels,
      datasets: [
        {
          label: "Data",
          data,
          backgroundColor: CHART_COLORS,
        },
      ],
      options,
    });
  }

  async renderAreaChart(
    labels: string[],
    datasets: ChartDataset[],
    options?: ChartOptions,
  ): Promise<string> {
    const areaDatasets = datasets.map((dataset) => ({
      ...dataset,
      fill: true,
    }));

    return this.renderChart({
      type: "line",
      labels,
      datasets: areaDatasets,
      options,
    });
  }

  async renderScatterChart(
    datasets: Array<{ label: string; data: Array<{ x: number; y: number }> }>,
    options?: ChartOptions,
  ): Promise<string> {
    return this.renderChart({
      type: "scatter",
      labels: [],
      datasets: datasets.map((dataset, index) => ({
        label: dataset.label,
        data: dataset.data as any,
        backgroundColor: CHART_COLORS[index % CHART_COLORS.length],
        borderColor: CHART_COLORS[index % CHART_COLORS.length],
      })),
      options,
    });
  }

  // Utility method to create multi-dataset charts
  static createDataset(
    label: string,
    data: number[],
    options: Partial<ChartDataset> = {},
  ): ChartDataset {
    return {
      label,
      data,
      ...options,
    };
  }

  // Method to validate chart data
  static validateChartData(data: ChartData): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!data.labels || data.labels.length === 0) {
      errors.push("Labels are required and cannot be empty");
    }

    if (!data.datasets || data.datasets.length === 0) {
      errors.push("At least one dataset is required");
    }

    data.datasets?.forEach((dataset, index) => {
      if (!dataset.data || dataset.data.length === 0) {
        errors.push(`Dataset ${index} data cannot be empty`);
      }
      if (
        dataset.data.length !== data.labels.length &&
        !["scatter", "bubble"].includes(data.type)
      ) {
        errors.push(`Dataset ${index} data length must match labels length`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

// Export singleton instance with default options - but don't initialize canvas yet
export const chartRenderer = new ChartRenderer();

// Export helper functions
export const renderChart = async (chartData: ChartData): Promise<string> => {
  const validation = ChartRenderer.validateChartData(chartData);
  if (!validation.valid) {
    throw new Error(`Invalid chart data: ${validation.errors.join(", ")}`);
  }
  return chartRenderer.renderChart(chartData);
};

// Legacy compatibility function
export const renderChartLegacy = async (config: any): Promise<string> => {
  const canvasReady = await initializeCanvas();

  if (!canvasReady || !ChartJSNodeCanvas) {
    console.warn(
      "Legacy chart rendering not available - canvas dependency missing",
    );
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1f2937"/>
        <text x="400" y="300" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#fff">
          Chart rendering not available
        </text>
      </svg>
    `;
    return Buffer.from(svg).toString("base64");
  }

  try {
    const canvas = new ChartJSNodeCanvas({
      width: 800,
      height: 600,
      backgroundColour: "#1f2937",
      plugins: { modern: [] },
    });
    const buffer = await canvas.renderToBuffer(config);
    return buffer.toString("base64");
  } catch (error) {
    console.error("Legacy chart rendering failed:", error);
    const svg = `
      <svg width="800" height="600" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#1f2937"/>
        <text x="400" y="280" text-anchor="middle" font-family="Arial, sans-serif" font-size="18" fill="#fff">
          Chart rendering failed
        </text>
        <text x="400" y="320" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#ccc">
          ${error.message}
        </text>
      </svg>
    `;
    return Buffer.from(svg).toString("base64");
  }
};
