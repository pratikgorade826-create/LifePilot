import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Bell,
  Sun,
  Moon,
  Plus,
  Sparkles,
  Plane,
  FolderPlus,
  CheckCircle2,
  Upload
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useNotificationStore } from '../../store/notificationStore';
import { useThemeStore } from '../../store/themeStore';

export const Navbar = ({ isCollapsed, pageTitle = '' }) => {
  const { user } = useAuthStore();
  const { unreadCount } = useNotificationStore();
  const { isDark, toggleTheme } = useThemeStore();
  const navigate = useNavigate();

  return (
    <header className="h-16 sticky top-0 z-30 bg-[#0B0F19]/90 backdrop-blur-md border-b border-slate-800/80 px-6 flex items-center justify-between">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h1 className="text-lg font-semibold text-slate-100">{pageTitle}</h1>
      </div>

      {/* Quick Action Center */}
      <div className="flex items-center gap-3">
        {/* Quick Launch Buttons */}
        <div className="hidden md:flex items-center gap-2">
          <button
            onClick={() => navigate('/assistant')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-sm transition"
          >
            <Sparkles size={14} />
            Ask Assistant
          </button>

          <button
            onClick={() => navigate('/trips')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Plane size={14} className="text-indigo-400" />
            Plan Trip
          </button>

          <button
            onClick={() => navigate('/projects')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <FolderPlus size={14} className="text-purple-400" />
            New Project
          </button>
        </div>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Notification bell */}
        <Link
          to="/notifications"
          className="relative p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition"
          title="Notifications"
        >
          <Bell size={18} />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-[#0B0F19]" />
          )}
        </Link>

        {/* Profile Avatar button */}
        <Link
          to="/profile"
          className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-violet-600 flex items-center justify-center text-xs font-bold text-white hover:ring-2 hover:ring-indigo-500 transition"
        >
          {user?.name?.charAt(0).toUpperCase() || 'U'}
        </Link>
      </div>
    </header>
  );
};

