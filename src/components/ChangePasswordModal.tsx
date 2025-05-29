import React, { useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/profile/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      toast.success('Password changed successfully');
      onClose();
    } catch {
      toast.error('Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Change Password</h2>
        <form onSubmit={handleChange} className="space-y-4">
          <div>
            <label className="block text-sm font-medium">Current Password</label>
            <input type="password" className="input-field mt-1" value={current} onChange={e => setCurrent(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium">New Password</label>
            <input type="password" className="input-field mt-1" value={next} onChange={e => setNext(e.target.value)} required />
          </div>
          <div>
            <label className="block text-sm font-medium">Confirm New Password</label>
            <input type="password" className="input-field mt-1" value={confirm} onChange={e => setConfirm(e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>Change</button>
          </div>
        </form>
      </div>
    </div>
  );
}
