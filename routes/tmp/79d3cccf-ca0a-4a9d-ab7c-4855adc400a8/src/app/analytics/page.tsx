import React from 'react';
import { Bar, Line } from 'react-chartjs-2';

interface DashboardPageProps {
  title: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor: string;
    borderColor: string;
  }[];
}

const DashboardPage: React.FC<DashboardPageProps> = ({ title }) => {
  const barChartData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Sales',
        data: [20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130],
        backgroundColor: '#007bff',
        borderColor: '#007bff',
      },
    ],
  };

  const lineChartData: ChartData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
    datasets: [
      {
        label: 'Revenue',
        data: [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000, 10000, 11000, 12000],
        backgroundColor: 'transparent',
        borderColor: '#007bff',
      },
    ],
  };

  return (
    <div>
      <h1>{title}</h1>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ width: '45%' }}>
          <Bar data={barChartData} options={{ maintainAspectRatio: false }} />
        </div>
        <div style={{ width: '45%' }}>
          <Line data={lineChartData} options={{ maintainAspectRatio: false }} />
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;