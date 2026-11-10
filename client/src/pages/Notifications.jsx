import React, { useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  CheckCheck,
  Plane,
  FolderKanban,
  FileText,
  CheckSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { useNotificationStore } from '../store/notificationStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Notifications = () => {
  const { notifications, unreadCount, fetchNotifications, markRead, markAllRead, isLoading } = useNotificationStore();

  useEffect(() => {
    fetchNotifications();
  }, []);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'TRAVEL':
        return <Plane size={16} className="text-blue-400" />;
      case 'PROJECT':
        return <FolderKanban size={16} className="text-purple-400" />;
      case 'DOCUMENT':
        return <FileText size={16} className="text-emerald-400" />;
      case 'TASK':
        return <CheckSquare size={16} className="text-indigo-400" />;
      default:
        return <Sparkles size={16} className="text-amber-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Bell size={22} className="text-indigo-400" />
            Activity & Notifications
          </h1>
          <p className="text-xs text-slate-400">
            Audit trail of AI actions, task updates, trip itineraries, and system triggers.
          </p>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 transition"
          >
            <CheckCheck size={14} /> Mark all read
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <LoadingSpinner label="Retrieving activity log..." />
      ) : notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((n) => (
            <Card
              key={n._id}
              onClick={() => !n.isRead && markRead(n._id)}
              className={`p-4 flex items-start gap-4 transition ${
                !n.isRead ? 'bg-indigo-950/20 border-indigo-500/30' : 'bg-[#111827]'
              }`}
            >
              <div className="p-2 rounded-xl bg-[#0B0F19] border border-slate-800 shrink-0 mt-0.5">
                {getTypeIcon(n.type)}
              </div>

              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className={`text-xs font-bold ${!n.isRead ? 'text-white' : 'text-slate-300'}`}>
                    {n.title}
                  </h3>
                  <span className="text-[10px] text-slate-500">{new Date(n.createdAt).toLocaleString()}</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">{n.message}</p>
              </div>

              {!n.isRead && (
                <span className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
              )}
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-12 text-center text-slate-400">
          <Bell size={32} className="text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-200 mb-1">No Notifications</h3>
          <p className="text-xs text-slate-500">All actions and saved itineraries will log here in real-time.</p>
        </Card>
      )}
    </div>
  );
};

