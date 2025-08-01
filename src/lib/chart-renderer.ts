// lib/chart-renderer.ts
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

export const renderChart = async (config: any): Promise<string> => {
  const chartJSNodeCanvas = new ChartJSNodeCanvas({
    width: 800,
    height: 600,
    backgroundColour: '#1f2937',
    plugins: {
      modern: []
    }
  });

  try {
    const buffer = await chartJSNodeCanvas.renderToBuffer(config);
    return buffer.toString('base64');
  } catch (error) {
    console.error('Chart rendering failed:', error);
    throw error;
  }
};
