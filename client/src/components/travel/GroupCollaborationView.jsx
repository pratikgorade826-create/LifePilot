import React, { useState } from 'react';
import {
  Users,
  Copy,
  Check,
  Shield,
  UserPlus,
  Trash2,
  Share2,
  Mail,
  Calendar,
  Crown,
  Edit,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const GroupCollaborationView = ({ trip, currentUser, onTripUpdated }) => {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const members = trip.members || [
    {
      userId: trip.ownerId,
      name: 'Trip Owner',
      email: '',
      role: 'owner'
    }
  ];

  const currentUserId = currentUser?._id ? currentUser._id.toString() : '';
  const isOwner = trip.ownerId?.toString() === currentUserId;

  const inviteCode = trip.inviteCode || 'LPT-GOA26';
  const inviteLink = `${window.location.origin}/trips/join?code=${inviteCode}`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleRoleChange = async (memberId, newRole) => {
    setLoadingAction(true);
    setErrorMsg('');
    try {
      const res = await tripsAPI.updateMemberRole(trip._id, memberId, newRole);
      setSuccessMsg('Member permission updated.');
      if (onTripUpdated) {
        onTripUpdated({ ...trip, members: res.data.members });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update role.');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRemoveMember = async (memberId, memberName) => {
    if (!window.confirm(`Remove ${memberName} from this trip?`)) return;

    setLoadingAction(true);
    setErrorMsg('');
    try {
      const res = await tripsAPI.removeMember(trip._id, memberId);
      setSuccessMsg(`${memberName} removed.`);
      if (onTripUpdated) {
        onTripUpdated({ ...trip, members: res.data.members });
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to remove member.');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Invite Code & Share Card */}
      <Card className="p-5 border-indigo-500/30 bg-gradient-to-r from-slate-900 to-indigo-950/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Users size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Group Trip Collaboration</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Invite friends and family to plan activities, vote on polls, and split expenses together.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="px-3.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-mono font-bold text-amber-400 flex items-center gap-2">
              <span>{inviteCode}</span>
              <button
                onClick={handleCopyCode}
                className="text-slate-400 hover:text-white transition"
                title="Copy Invite Code"
              >
                {copiedCode ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              </button>
            </div>

            <button
              onClick={handleCopyLink}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow transition"
            >
              {copiedLink ? <Check size={14} className="text-emerald-300" /> : <Share2 size={14} />}
              {copiedLink ? 'Link Copied!' : 'Copy Invite Link'}
            </button>
          </div>
        </div>
      </Card>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Members List */}
      <Card className="p-5 border-slate-800 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <h4 className="text-sm font-bold text-white">Trip Members ({members.length})</h4>
            <p className="text-xs text-slate-400">Collaborators with shared itinerary and voting access</p>
          </div>
          <span className="text-[11px] text-slate-400">
            {isOwner ? '👑 You are Trip Owner' : '👥 You are a Member'}
          </span>
        </div>

        <div className="space-y-3">
          {members.map((member, i) => {
            const memberId = member.userId ? member.userId.toString() : (member._id ? member._id.toString() : `m-${i}`);
            const isMemberOwner = member.role === 'owner' || (trip.ownerId && trip.ownerId.toString() === memberId);

            return (
              <div
                key={memberId || i}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700/80 transition flex items-center justify-between gap-4 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm border ${
                    isMemberOwner
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30'
                  }`}>
                    {member.name ? member.name.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{member.name || 'Traveler'}</span>
                      {isMemberOwner && (
                        <span className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/20">
                          <Crown size={11} /> Owner
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400">{member.email || 'Group traveler'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Role badge or dropdown */}
                  {isOwner && !isMemberOwner ? (
                    <select
                      value={member.role || 'editor'}
                      onChange={(e) => handleRoleChange(memberId, e.target.value)}
                      disabled={loadingAction}
                      className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="editor">Editor (Can Propose Changes)</option>
                      <option value="viewer">Viewer (View & Vote Only)</option>
                    </select>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 font-semibold text-[11px] capitalize border border-slate-800">
                      {member.role || 'member'}
                    </span>
                  )}

                  {/* Remove Button */}
                  {isOwner && !isMemberOwner && (
                    <button
                      onClick={() => handleRemoveMember(memberId, member.name)}
                      disabled={loadingAction}
                      className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded-lg transition"
                      title="Remove Member"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

