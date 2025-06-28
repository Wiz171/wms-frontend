import React from 'react';

export interface Task {
  _id: string;
  type: string;
  assignedTo: string;
  details: string;
  status: 'Pending' | 'In Progress' | 'Completed';
  deadline: string;
}

interface TaskTimelineTableProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task['status']) => void;
}

export const TaskTimelineTable: React.FC<TaskTimelineTableProps> = ({ tasks, onStatusChange }) => {
  return (
    <div className="bg-white rounded-lg shadow p-4 overflow-x-auto">
      <h2 className="font-bold mb-2 text-lg">Task Timeline</h2>
      <table className="min-w-full text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="px-2 py-1">Type</th>
            <th className="px-2 py-1">Assigned To</th>
            <th className="px-2 py-1">Details</th>
            <th className="px-2 py-1">Status</th>
            <th className="px-2 py-1">Deadline</th>
            <th className="px-2 py-1">Action</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task._id} className="border-b">
              <td className="px-2 py-1">{task.type}</td>
              <td className="px-2 py-1">{task.assignedTo}</td>
              <td className="px-2 py-1">{task.details}</td>
              <td className="px-2 py-1">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  task.status === 'Pending'
                    ? 'bg-pink-100 text-pink-700'
                    : task.status === 'In Progress'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-purple-100 text-purple-700'
                }`}>
                  {task.status}
                </span>
              </td>
              <td className="px-2 py-1">{new Date(task.deadline).toLocaleDateString()}</td>
              <td className="px-2 py-1">
                <select
                  value={task.status}
                  onChange={(e) => onStatusChange(task._id, e.target.value as Task['status'])}
                  className="input-field"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
