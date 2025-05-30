// src/utils/log.ts
// Utility for logging user actions on the frontend (for audit trail, debugging, or sending to backend)

export interface LogEntry {
  action: string; // e.g. 'create', 'update', 'delete'
  entity: string; // e.g. 'product', 'customer', 'order', etc.
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

/**
 * Log a user action locally (and optionally send to backend)
 * @param entry LogEntry
 */
export function logAction(entry: LogEntry) {
  // Optionally: send to backend, or just log to console/localStorage
  entry.timestamp = new Date().toISOString();
  // For now, just log to console
  // TODO: POST to backend /api/logs if needed
  // Optionally store in localStorage for debugging
  if (typeof window !== 'undefined') {
    const logs = JSON.parse(localStorage.getItem('userLogs') || '[]');
    logs.push(entry);
    localStorage.setItem('userLogs', JSON.stringify(logs));
  }
  // Always log to console for dev
  // eslint-disable-next-line no-console
  console.log('[UserLog]', entry);
}
