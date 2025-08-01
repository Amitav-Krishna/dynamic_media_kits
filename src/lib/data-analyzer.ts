// lib/data-analyzer.ts
import { renderChart  } from './chart-renderer';

export interface AnalysisResult {
  success: boolean;
  output?: string;
  error?: string;
  charts?: string[]; // Base64 encoded images
}

export interface DataPoint {
  [key: string]: any;
}


// Replace the createChart function with:
async function createChart(config: ChartConfiguration): Promise<string> {
  const width = 800;
  const height = 600;
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
  width: 800,
  height: 600,
  backgroundColour: '#1f2937'}) // Gray-800
  try {
    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Chart generation error:', error);
    throw error;
  }
}
export class DataAnalyzer {
  private data: DataPoint[];
  private output: string[] = [];
  private charts: string[] = [];

  constructor(data: DataPoint[]) {
    this.data = data;
    this.output = [];
    this.charts = [];
  }

  // Utility functions
  log(message: string) {
    this.output.push(message);
    console.log(message);
  }

  // Statistical functions
  mean(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0) / values.length;
  }

  median(values: number[]): number {
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  sum(values: number[]): number {
    return values.reduce((sum, val) => sum + val, 0);
  }

  max(values: number[]): number {
    return Math.max(...values);
  }

  min(values: number[]): number {
    return Math.min(...values);
  }

  count(values: any[]): number {
    return values.length;
  }

  // Group by function
  groupBy(field: string): { [key: string]: DataPoint[] } {
    return this.data.reduce((groups, item) => {
      const key = item[field] || 'Unknown';
      if (!groups[key]) groups[key] = [];
      groups[key].push(item);
      return groups;
    }, {} as { [key: string]: DataPoint[] });
  }

  // Analysis functions
  async analyzeFollowersBySport(): Promise<void> {
    this.log("Analyzing average followers by sport...\n");

    const sportGroups = this.groupBy('sport');
    const results: { sport: string; avgFollowers: number; count: number; totalFollowers: number }[] = [];

    for (const [sport, influencers] of Object.entries(sportGroups)) {
      const followers = influencers.map(inf => inf.follower_count || 0);
      const avgFollowers = Math.round(this.mean(followers));
      const totalFollowers = this.sum(followers);

      results.push({
        sport,
        avgFollowers,
        count: followers.length,
        totalFollowers
      });
    }

    // Sort by average followers
    results.sort((a, b) => b.avgFollowers - a.avgFollowers);

    this.log("Results:");
    results.forEach(result => {
      this.log(`${result.sport}: ${result.avgFollowers.toLocaleString()} avg followers (${result.count} influencers, ${result.totalFollowers.toLocaleString()} total)`);
    });

    // Create bar chart
    const chartConfig: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: results.map(r => r.sport),
        datasets: [{
          label: 'Average Followers',
          data: results.map(r => r.avgFollowers),
          backgroundColor: 'rgba(54, 162, 235, 0.8)',
          borderColor: 'rgba(54, 162, 235, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Average Followers by Sport',
            color: 'white'
          },
          legend: {
            labels: { color: 'white' }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { color: 'white' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          x: {
            ticks: { color: 'white' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        backgroundColor: '#1f2937'
      }
    };

    try {
    const chartImage = await renderChart({
        type: 'bar',
        data: {
          labels: results.map(r => r.sport),
          datasets: [{
            label: 'Average Followers',
            data: results.map(r => r.avgFollowers),
            backgroundColor: 'rgba(139, 92, 246, 0.7)',
            borderColor: 'rgba(139, 92, 246, 1)',
            borderWidth: 1
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          plugins: {
            title: {
              display: true,
              text: 'Average Followers by Sport',
              color: '#f3f4f6'
            },
            legend: {
              display: false
            }
          },
          scales: {
            x: {
              beginAtZero: true,
              ticks: { color: '#f3f4f6' },
              grid: { color: 'rgba(255,255,255,0.1)' }
            },
            y: {
              ticks: { color: '#f3f4f6' },
              grid: { display: false }
            }
          }
        }
      });
    console.log('Chart generated (length):', chartImage.length); // Should show a large number
    this.charts.push(chartImage);
    this.log("\n📊 Chart generated successfully!");
    } catch (error) {
    console.error('Detailed chart error:', error); // Get full error details
    this.log("\n❌ Failed to generate chart");
    }
  }

async analyzeFollowerDistribution(): Promise<void> {
    this.log("Analyzing follower count distribution...\n");

    const followers = this.data.map(inf => inf.follower_count || 0);

    // Basic stats
    const stats = {
        mean: Math.round(this.mean(followers)),
        median: Math.round(this.median(followers)),
        min: this.min(followers),
        max: this.max(followers),
        total: this.sum(followers)
    };

    this.log("Distribution Statistics:");
    this.log(`Mean: ${stats.mean.toLocaleString()} followers`);
    this.log(`Median: ${stats.median.toLocaleString()} followers`);
    this.log(`Range: ${stats.min.toLocaleString()} - ${stats.max.toLocaleString()} followers`);
    this.log(`Total: ${stats.total.toLocaleString()} followers across all influencers`);

    // Create histogram bins
    const bins = 10;
    const binSize = (stats.max - stats.min) / bins;
    const histogram = Array(bins).fill(0);
    const binLabels: string[] = [];

    followers.forEach(count => {
        const binIndex = Math.min(Math.floor((count - stats.min) / binSize), bins - 1);
        histogram[binIndex]++;
    });

    // Generate bin labels
    for (let i = 0; i < bins; i++) {
        const start = Math.round(stats.min + i * binSize);
        const end = Math.round(stats.min + (i + 1) * binSize);
        binLabels.push(`${start.toLocaleString()}-${end.toLocaleString()}`);
    }

    // Create histogram chart - FIXED THIS SECTION
    const chartConfig: ChartConfiguration = {
        type: 'bar',
        data: {
            labels: binLabels,
            datasets: [{
                label: 'Number of Influencers',
                data: histogram,
                backgroundColor: 'rgba(75, 192, 192, 0.7)',
                borderColor: 'rgba(75, 192, 192, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                title: {
                    display: true,
                    text: 'Follower Count Distribution',
                    font: {
                        family: 'sans-serif',
                        size: 16
                    },
                    color: '#f3f4f6'
                },
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Follower Range',
                        color: '#f3f4f6'
                    },
                    ticks: {
                        color: '#f3f4f6',
                        font: {
                            family: 'sans-serif'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                y: {
                    title: {
                        display: true,
                        text: 'Number of Influencers',
                        color: '#f3f4f6'
                    },
                    ticks: {
                        color: '#f3f4f6',
                        font: {
                            family: 'sans-serif'
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    beginAtZero: true
                }
            }
        }
    };

    try {
        const chartImage = await createChart(chartConfig);
        this.charts.push(chartImage);
        this.log("\n📊 Distribution chart generated successfully!");
    } catch (error) {
        console.error('Chart generation error:', error);
        this.log("\n❌ Failed to generate chart");
    }
}
  async analyzeTopInfluencers(limit: number = 10): Promise<void> {
    this.log(`Analyzing top ${limit} influencers by followers...\n`);

    const sorted = [...this.data]
      .sort((a, b) => (b.follower_count || 0) - (a.follower_count || 0))
      .slice(0, limit);

    sorted.forEach((inf, index) => {
      this.log(`${index + 1}. ${inf.name} (@${inf.username}): ${(inf.follower_count || 0).toLocaleString()} followers${inf.sport ? ` (${inf.sport})` : ''}`);
    });

    // Create top influencers chart
    const chartConfig: ChartConfiguration = {
      type: 'horizontalBar',
      data: {
        labels: sorted.map(inf => inf.name),
        datasets: [{
          label: 'Followers',
          data: sorted.map(inf => inf.follower_count || 0),
          backgroundColor: 'rgba(255, 99, 132, 0.8)',
          borderColor: 'rgba(255, 99, 132, 1)',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: {
          title: {
            display: true,
            text: `Top ${limit} Influencers by Followers`,
            color: 'white'
          },
          legend: {
            labels: { color: 'white' }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { color: 'white' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          },
          y: {
            ticks: { color: 'white' },
            grid: { color: 'rgba(255, 255, 255, 0.1)' }
          }
        },
        backgroundColor: '#1f2937'
      }
    };

    try {
      const chartImage = await createChart(chartConfig);
      this.charts.push(chartImage);
      this.log("\n📊 Top influencers chart generated successfully!");
    } catch (error) {
      this.log("\n❌ Failed to generate chart");
    }
  }

  getResults(): AnalysisResult {
    return {
      success: true,
      output: this.output.join('\n'),
      charts: this.charts
    };
  }
}
