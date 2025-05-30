import React, { useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';
import { logAction } from '../utils/log';

// Declare global property for deduplication
declare global {
  interface Window {
    __toastShown?: boolean;
  }
}

// @ts-ignore
if (typeof window !== 'undefined' && window.__toastShown === undefined) {
  // @ts-ignore
  window.__toastShown = false;
}

export default function ChangePasswordModal({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = async (e: React.FormEvent) => {
    e.preventDefault();
    // @ts-ignore
    if (next !== confirm) {
      if (!window.__toastShown) {
        toast.error('Passwords do not match');
        // @ts-ignore
        window.__toastShown = true;
        setTimeout(() => { window.__toastShown = false; }, 1000);
      }
      return;
    }
    setLoading(true);
    try {
      await apiRequest('/api/profile/change-password', {
        method: 'POST',
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      // Log password change
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      logAction({
        action: 'update',
        entity: 'user-password',
        entityId: user.id,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        },
        details: { message: 'Password changed' }
      });
      // @ts-ignore
      if (!window.__toastShown) {
        toast.success('Password changed successfully');
        // @ts-ignore
        window.__toastShown = true;
        setTimeout(() => { window.__toastShown = false; }, 1000);
      }
      onClose();
    } catch {
      // @ts-ignore
      if (!window.__toastShown) {
        toast.error('Failed to change password');
        // @ts-ignore
        window.__toastShown = true;
        setTimeout(() => { window.__toastShown = false; }, 1000);
      }
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
