import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Role {
  role: string;
  permissions: Record<string, string[]>;
}

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

export default function AssignRoleModal({ open, onClose, users, roles, onAssign }: {
  open: boolean;
  onClose: () => void;
  users: User[];
  roles: Role[];
  onAssign: (userId: string, role: string) => void;
}) {
  const [selectedUser, setSelectedUser] = useState('');
  const [selectedRole, setSelectedRole] = useState('');

  useEffect(() => {
    if (!open) {
      setSelectedUser('');
      setSelectedRole('');
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Assign Role to User</h2>
        <div className="mb-4">
          <label className="block mb-1">User</label>
          <select
            className="input-field w-full"
            value={selectedUser}
            onChange={e => setSelectedUser(e.target.value)}
          >
            <option value="">Select user</option>
            {users.map(user => (
              <option key={user.id} value={user.id}>{user.name} ({user.email})</option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block mb-1">Role</label>
          <select
            className="input-field w-full"
            value={selectedRole}
            onChange={e => setSelectedRole(e.target.value)}
          >
            <option value="">Select role</option>
            {roles.map(role => (
              <option key={role.role} value={role.role}>{role.role}</option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2">
          <button className="btn" onClick={onClose}>Cancel</button>
          <button
            className="btn-primary"
            disabled={!selectedUser || !selectedRole}
            onClick={() => {
              onAssign(selectedUser, selectedRole);
              onClose();
            }}
          >
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}
