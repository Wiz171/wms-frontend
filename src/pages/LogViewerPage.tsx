import React, { useState, useEffect } from 'react';
import { logAction } from '../utils/log';

interface LogEntry {
  action: string;
  entity: string;
  entityId?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  timestamp?: string;
  details?: Record<string, any>;
}

export default function LogViewerPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  useEffect(() => {
    // Load logs from localStorage
    const stored = localStorage.getItem('userLogs');
    if (stored) {
      setLogs(JSON.parse(stored));
    }
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">User Action Logs (Local)</h1>
      {logs.length === 0 ? (
        <div className="text-gray-500">No logs found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                <th className="p-2 border">Timestamp</th>
                <th className="p-2 border">User</th>
                <th className="p-2 border">Action</th>
                <th className="p-2 border">Entity</th>
                <th className="p-2 border">Entity ID</th>
                <th className="p-2 border">Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.slice().reverse().map((log, idx) => (
                <tr key={idx}>
                  <td className="p-2 border">{log.timestamp ? new Date(log.timestamp).toLocaleString() : '--'}</td>
                  <td className="p-2 border">{log.user ? `${log.user.name} (${log.user.email})` : '--'}</td>
                  <td className="p-2 border">{log.action}</td>
                  <td className="p-2 border">{log.entity}</td>
                  <td className="p-2 border">{log.entityId || '--'}</td>
                  <td className="p-2 border">
                    <pre className="whitespace-pre-wrap">{log.details ? JSON.stringify(log.details, null, 2) : '--'}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <button
        className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200"
        onClick={() => {
          localStorage.removeItem('userLogs');
          setLogs([]);
        }}
      >
        Clear Logs
      </button>
    </div>
  );
}
