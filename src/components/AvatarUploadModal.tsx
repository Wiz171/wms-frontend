import React, { useState } from 'react';
import { apiRequest } from '../api';
import toast from 'react-hot-toast';

export default function AvatarUploadModal({ onClose }: { onClose: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      toast.error('Please select an image file');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await apiRequest('/api/profile/avatar', {
        method: 'POST',
        body: formData,
      });
      toast.success('Avatar uploaded successfully');
      onClose();
    } catch {
      toast.error('Failed to upload avatar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h2 className="text-lg font-bold mb-4">Upload Avatar</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={e => setFile(e.target.files?.[0] || null)}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={loading}>Upload</button>
          </div>
        </form>
      </div>
    </div>
  );
}
