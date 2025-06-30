import React from 'react';
import { Bar } from 'react-chartjs-2';
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from 'chart.js';

Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export interface Task {
  _id: string;
  assignedTo: string;
}

interface TaskWorkloadChartProps {
  tasks: Task[];
}

export const TaskWorkloadChart: React.FC<TaskWorkloadChartProps> = ({ tasks }) => {
  const assignees = Array.from(new Set(tasks.map((t) => t.assignedTo)));
  const taskCounts = assignees.map((a) => tasks.filter((t) => t.assignedTo === a).length);
  const data = {
    labels: assignees,
    datasets: [
      {
        label: 'Tasks',
        data: taskCounts,
        backgroundColor: '#0073EA',
      },
    ],
  };
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="font-bold mb-2 text-lg">Task Workload</h2>
      <Bar data={data} />
    </div>
  );
};
