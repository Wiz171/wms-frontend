import { useState } from 'react';

const MODULES = [
  'users',
  'products',
  'customers',
  'purchase_orders',
  'orders',
  'tasks',
  'dashboard',
];
const ACTIONS = ['create', 'read', 'update', 'delete', 'manage'];

export default function EditPermissionsModal({ role, onClose, onSave }: {
  role: { role: string; permissions: Record<string, string[]> };
  onClose: () => void;
  onSave: (permissions: Record<string, string[]>) => void;
}) {
  const [permissions, setPermissions] = useState<Record<string, string[]>>(
    role.permissions || {}
  );

  const handleToggle = (module: string, action: string) => {
    setPermissions(prev => {
      const current = prev[module] || [];
      if (current.includes(action)) {
        return { ...prev, [module]: current.filter(a => a !== action) };
      } else {
        return { ...prev, [module]: [...current, action] };
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-lg font-bold mb-4">Edit Permissions for {role.role}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full border text-xs">
            <thead>
              <tr>
                <th className="p-2 border">Module</th>
                {ACTIONS.map(action => (
                  <th key={action} className="p-2 border">{action}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(module => (
                <tr key={module}>
                  <td className="p-2 border font-mono">{module}</td>
                  {ACTIONS.map(action => (
                    <td key={action} className="p-2 border text-center">
                      <input
                        type="checkbox"
                        checked={permissions[module]?.includes(action) || false}
                        onChange={() => handleToggle(module, action)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            onClick={() => onSave(permissions)}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
