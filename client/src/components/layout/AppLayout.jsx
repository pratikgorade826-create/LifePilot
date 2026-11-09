import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { useNotificationStore } from '../../store/notificationStore';
import { useAuthStore } from '../../store/authStore';

export const AppLayout = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { fetchNotifications } = useNotificationStore();
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (pathname) => {
    if (pathname === '/dashboard') return 'Overview & Analytics';
    if (pathname === '/assistant') return 'Unified AI Assistant';
    if (pathname.startsWith('/trips')) return 'Smart Trip Planner';
    if (pathname.startsWith('/projects')) return 'AI Project Organizer';
    if (pathname === '/kanban') return 'Kanban Task Board';
    if (pathname.startsWith('/documents')) return 'Personal Knowledge Hub';
    if (pathname === '/tasks') return 'Central Task Manager';
    if (pathname === '/calendar') return 'Timeline & Calendar';
    if (pathname === '/notifications') return 'Activity & Notifications';
    if (pathname === '/profile') return 'My Profile';
    if (pathname === '/settings') return 'Application Settings';
    return 'LifePilot AI';
  };

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex">
      {/* Sidebar */}
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col transition-all duration-300 ${
          isCollapsed ? 'ml-20' : 'ml-64'
        }`}
      >
        <Navbar isCollapsed={isCollapsed} pageTitle={getPageTitle(location.pathname)} />

        <main className="flex-1 p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
