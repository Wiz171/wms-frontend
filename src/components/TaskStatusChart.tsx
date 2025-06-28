import React from 'react';
import { Pie } from 'react-chartjs-2';
import { Chart, ArcElement, Tooltip, Legend } from 'chart.js';

Chart.register(ArcElement, Tooltip, Legend);

export interface Task {
  _id: string;
  status: 'Pending' | 'In Progress' | 'Completed';
}

interface TaskStatusChartProps {
  tasks: Task[];
}

const statusColors = {
  Pending: '#FF4D8D',
  'In Progress': '#0073EA',
  Completed: '#6B46C1',
};

export const TaskStatusChart: React.FC<TaskStatusChartProps> = ({ tasks }) => {
  const statusCounts = ['Pending', 'In Progress', 'Completed'].map(
    (status) => tasks.filter((t) => t.status === status).length
  );
  const data = {
    labels: ['Pending', 'In Progress', 'Completed'],
    datasets: [
      {
        data: statusCounts,
        backgroundColor: [statusColors.Pending, statusColors['In Progress'], statusColors.Completed],
        borderWidth: 1,
      },
    ],
  };
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-bold mb-2 text-lg">Task Status</h2>
      <Pie data={data} />
    </div>
  );
};
