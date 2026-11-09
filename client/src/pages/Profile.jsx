import React, { useState } from 'react';
import { User, Mail, Shield, Sparkles, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const Profile = () => {
  const { user, updateProfile } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');

    const res = await updateProfile({ name, bio });
    if (res.success) {
      setMessage('Profile updated successfully.');
      setTimeout(() => setMessage(''), 3000);
    } else {
      setError(res.error || 'Update failed.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <User size={22} className="text-indigo-400" />
          User Profile
        </h1>
        <p className="text-xs text-slate-400">
          Manage your personal information, role details, and account credentials.
        </p>
      </div>

      {message && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <Check size={16} />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* User Card */}
      <Card className="p-6">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-2xl shadow-xl shadow-indigo-500/20 shrink-0">
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-white">{user?.name || 'User'}</h2>
              <Badge variant="primary">{user?.role || 'user'}</Badge>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">{user?.email}</p>
            <p className="text-xs text-indigo-400 mt-2 italic">"{user?.bio || 'Achieving goals with LifePilot AI'}"</p>
          </div>
        </div>
      </Card>

      {/* Edit Form */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Edit Profile</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Email Address</label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full px-3.5 py-2.5 bg-[#0B0F19]/50 border border-slate-800 rounded-xl text-xs text-slate-500 cursor-not-allowed"
            />
            <span className="text-[10px] text-slate-500 block mt-1">Email address is your primary workspace identifier.</span>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Personal Bio</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A few words about your everyday pursuits..."
              className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              <span>{saving ? 'Saving...' : 'Save Profile Changes'}</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

