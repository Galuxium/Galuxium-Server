// Dashboard.tsx

import React from 'react';
import { Bar, Line } from 'react-chartjs-2';
import 'chart.js/auto';

interface DashboardProps {
  salesData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
      borderColor: string;
    }[];
  };
  projectData: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor: string;
    }[];
  };
}

const Dashboard: React.FC<DashboardProps> = ({ salesData, projectData }) => {
  return (
    <div>
      <h1>Sales Dashboard</h1>
      <Bar data={salesData} />
      <h1>Projects Dashboard</h1>
      <Line data={projectData} />
    </div>
  );
};

export default Dashboard;