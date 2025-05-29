import React, { useEffect, useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import AssignRoleModal from '../components/AssignRoleModal';
import EditPermissionsModal from '../components/EditPermissionsModal';

interface Role {
  role: string;
  permissions: Record<string, string[]>;
}

export default function RoleManagementPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [newRole, setNewRole] = useState('');
  const [newPermissions, setNewPermissions] = useState('');
  const [loading, setLoading] = useState(false);
  const [editRole, setEditRole] = useState<Role | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [users, setUsers] = useState<any[]>([]);

  const fetchRoles = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/roles', { method: 'GET' });
      setRoles(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to fetch roles');
    } finally {
      setLoading(false);
    }
  };

  // Fetch users for assignment
  const fetchUsers = async () => {
    try {
      const data = await apiRequest('/api/users', { method: 'GET' });
      setUsers(Array.isArray(data) ? data.map((u: any) => ({ ...u, id: u._id })) : []);
    } catch {
      setUsers([]);
    }
  };

  useEffect(() => {
    fetchRoles();
    fetchUsers();
  }, []);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          role: newRole,
          permissions: JSON.parse(newPermissions || '{}'),
        }),
      });
      toast.success('Role created');
      setNewRole('');
      setNewPermissions('');
      fetchRoles();
    } catch (err) {
      toast.error('Failed to create role');
    }
  };

  const handleDeleteRole = async (role: string) => {
    if (!window.confirm('Delete this role?')) return;
    try {
      await apiRequest(`/api/roles/${role}`, { method: 'DELETE' });
      toast.success('Role deleted');
      fetchRoles();
    } catch (err) {
      toast.error('Failed to delete role');
    }
  };

  // Edit permissions UI
  const handleEditPermissions = (role: Role) => {
    setEditRole(role);
  };
  const handleSavePermissions = async (updatedPermissions: Record<string, string[]>) => {
    if (!editRole) return;
    try {
      await apiRequest(`/api/roles/${editRole.role}/permissions`, {
        method: 'POST',
        body: JSON.stringify({ permissions: updatedPermissions }),
      });
      toast.success('Permissions updated');
      setEditRole(null);
      fetchRoles();
    } catch {
      toast.error('Failed to update permissions');
    }
  };
  // Assign role to user
  const handleAssignRole = async (userId: string, role: string) => {
    try {
      await apiRequest(`/api/users/${userId}/role`, {
        method: 'POST',
        body: JSON.stringify({ role }),
      });
      toast.success('Role assigned');
      fetchUsers();
    } catch {
      toast.error('Failed to assign role');
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Role Management</h1>
      <button className="btn-primary" onClick={() => setShowAssignModal(true)}>
        Assign Role to User
      </button>
      <AssignRoleModal
        open={showAssignModal}
        onClose={() => setShowAssignModal(false)}
        users={users}
        roles={roles}
        onAssign={handleAssignRole}
      />
      <form onSubmit={handleCreateRole} className="space-y-2">
        <input
          type="text"
          placeholder="Role name"
          value={newRole}
          onChange={e => setNewRole(e.target.value)}
          className="input-field"
          required
        />
        <textarea
          placeholder='Permissions as JSON (e.g. {"users":["manage"]})'
          value={newPermissions}
          onChange={e => setNewPermissions(e.target.value)}
          className="input-field"
        />
        <button type="submit" className="btn-primary">Create Role</button>
      </form>
      <div>
        <h2 className="text-lg font-semibold mb-2">Existing Roles</h2>
        {loading ? (
          <div>Loading...</div>
        ) : (
          <ul className="space-y-2">
            {roles.map(role => (
              <li key={role.role} className="flex flex-col gap-2 border p-4 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="font-mono font-bold text-primary-700">{role.role}</span>
                  <button onClick={() => handleEditPermissions(role)} className="btn">Edit Permissions</button>
                  <button onClick={() => handleDeleteRole(role.role)} className="text-red-600">Delete</button>
                </div>
                <pre className="bg-gray-100 p-2 rounded text-xs mt-2">{JSON.stringify(role.permissions, null, 2)}</pre>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Edit Permissions Modal */}
      {editRole && (
        <EditPermissionsModal
          role={editRole}
          onClose={() => setEditRole(null)}
          onSave={handleSavePermissions}
        />
      )}
    </div>
  );
}
