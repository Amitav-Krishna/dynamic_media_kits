'use client';

import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface FollowerGrowthGraphProps {
  currentFollowers: number;
  weeklyGrowth: number;
}

export default function FollowerGrowthGraph({ 
  currentFollowers, 
  weeklyGrowth 
}: FollowerGrowthGraphProps) {
  // Generate mock historical data (working backwards)
  const weeksToShow = 12;
  const dataPoints = Array.from({ length: weeksToShow }, (_, i) => {
    const weekNumber = weeksToShow - i;
    return Math.max(0, currentFollowers - (weeklyGrowth * (i+1)));
  }).reverse();
  
  dataPoints.push(currentFollowers); // Add current week

  const labels = dataPoints.map((_, i) => 
    i === weeksToShow ? 'Now' : `${weeksToShow - i}w ago`
  );

  const data = {
    labels,
    datasets: [
      {
        label: 'Follower Growth',
        data: dataPoints,
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.5)',
        tension: 0.3,
      },
    ],
  };

  const options = {
    responsive: true,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.raw.toLocaleString()}`;
          }
        }
      }
    },
    scales: {
      y: {
        ticks: {
          callback: (value: any) => {
            if (value >= 1000000) {
              return `${(value / 1000000).toFixed(1)}M`;
            }
            if (value >= 1000) {
              return `${(value / 1000).toFixed(0)}K`;
            }
            return value;
          }
        }
      }
    }
  };

  return (
    <div className="border border-gray-800 p-6 ">
      <h3 className="font-bold mb-4">Follower Growth (Last {weeksToShow} Weeks)</h3>
      <div className="h-6400 -mb-700">
        <Line data={data} options={options} />
      </div>
    </div>
  );
}/* Placeholder */
