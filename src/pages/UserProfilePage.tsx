import React, { useEffect, useState } from 'react';
import { apiRequest, logout } from '../api';
import toast from 'react-hot-toast';
import ChangePasswordModal from '../components/ChangePasswordModal';
import { useNavigate } from 'react-router-dom';

export default function UserProfilePage() {
  const [profile, setProfile] = useState<any>(null);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const data = await apiRequest('/api/profile/me');
      setProfile(data);
      setForm(data);
    } catch {
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    try {
      await apiRequest('/api/profile/me', {
        method: 'PUT',
        body: JSON.stringify(form),
      });
      toast.success('Profile updated');
      setProfile(form);
      setEdit(false);
    } catch {
      toast.error('Failed to update profile');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/login');
  };

  if (loading) return <div>Loading...</div>;
  if (!profile) return <div>No profile found.</div>;

  return (
    <div className="max-w-lg mx-auto mt-8 p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-bold mb-4">User Profile</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Name:</label>
          {edit ? (
            <input
              name="name"
              value={form.name || ''}
              onChange={handleChange}
              className="input-field mt-1"
            />
          ) : (
            <span>{profile.name}</span>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Email:</label>
          <span>{profile.email}</span>
        </div>
        {/* Add more fields as needed */}
        <div className="flex gap-2 mt-4">
          {edit ? (
            <>
              <button className="btn-primary" onClick={handleSave}>Save</button>
              <button className="btn" onClick={() => setEdit(false)}>Cancel</button>
              <button className="btn" onClick={() => setShowChangePassword(true)}>
                Change Password
              </button>
            </>
          ) : (
            <>
              <button className="btn-primary" onClick={() => setEdit(true)}>Edit</button>
              <button className="btn" onClick={() => setShowChangePassword(true)}>Change Password</button>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-2 mt-8 justify-end">
        <button className="btn text-red-600 border border-red-300 hover:bg-red-50" onClick={handleLogout}>
          Logout
        </button>
      </div>
      {showChangePassword && (
        <ChangePasswordModal onClose={() => setShowChangePassword(false)} />
      )}
    </div>
  );
}
