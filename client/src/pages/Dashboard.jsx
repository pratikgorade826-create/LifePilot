import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  FolderKanban,
  CheckCircle2,
  FileText,
  Clock,
  ArrowRight,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Plus,
  MessageSquare,
  CheckSquare
} from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { dashboardAPI } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Dashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, actRes] = await Promise.all([
        dashboardAPI.getStats(),
        dashboardAPI.getActivity()
      ]);
      setData(statsRes.data);
      setActivities(actRes.data?.activities || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Assembling your unified intelligence..." />;
  }

  const stats = data?.stats || {
    totalTrips: 0,
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
    totalDocuments: 0,
    completionRate: 0
  };

  const statCards = [
    {
      title: 'Trips Planned',
      value: stats.totalTrips,
      icon: Plane,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10 border-blue-500/20',
      link: '/trips'
    },
    {
      title: 'Active Projects',
      value: stats.totalProjects,
      icon: FolderKanban,
      color: 'text-purple-400',
      bg: 'bg-purple-500/10 border-purple-500/20',
      link: '/projects'
    },
    {
      title: 'Tasks Finished',
      value: `${stats.completedTasks}/${stats.totalTasks}`,
      sub: `${stats.completionRate}% completion`,
      icon: CheckCircle2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      link: '/tasks'
    },
    {
      title: 'Documents Stored',
      value: stats.totalDocuments,
      icon: FileText,
      color: 'text-amber-400',
      bg: 'bg-amber-500/10 border-amber-500/20',
      link: '/documents'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900/50 via-purple-900/40 to-slate-900 border border-indigo-500/30 p-6 sm:p-8">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              <Sparkles size={14} />
              <span>Unified Intelligence Operational</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Welcome back, {user?.name || 'Explorer'}!
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              LifePilot AI is ready. Organize trips, map out milestones, track todos, or query documents with zero friction.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => navigate('/assistant')}
              className="px-5 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white shadow-lg shadow-indigo-500/25 transition flex items-center gap-2"
            >
              <Sparkles size={16} />
              Talk to Copilot
            </button>
            <button
              onClick={() => navigate('/tasks')}
              className="px-4 py-2.5 rounded-xl font-medium text-xs sm:text-sm bg-[#111827] hover:bg-slate-800 text-slate-200 border border-slate-700 transition flex items-center gap-2"
            >
              <CheckSquare size={16} />
              View Tasks
            </button>
          </div>
        </div>
      </div>

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <Link key={i} to={card.link} className="block group">
              <Card hover className="h-full">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-medium text-slate-400">{card.title}</span>
                  <div className={`p-2 rounded-xl border ${card.bg} ${card.color} group-hover:scale-110 transition-transform`}>
                    <Icon size={18} />
                  </div>
                </div>
                <div className="text-2xl font-bold text-white mb-1">{card.value}</div>
                {card.sub && <div className="text-xs text-emerald-400 font-medium flex items-center gap-1"><TrendingUp size={12} /> {card.sub}</div>}
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Donut */}
        <Card className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Task Completion Rate</h3>
            <span className="text-xs text-slate-400">{stats.totalTasks} Total Tasks</span>
          </div>

          {stats.totalTasks > 0 ? (
            <div className="h-56 relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.charts?.taskStatus || []}
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(data?.charts?.taskStatus || []).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute text-center">
                <span className="text-2xl font-bold text-white">{stats.completionRate}%</span>
                <span className="block text-[11px] text-slate-400">Done</span>
              </div>
            </div>
          ) : (
            <div className="h-56 flex flex-col items-center justify-center text-center p-4">
              <p className="text-xs text-slate-400">No tasks tracked yet. Plan a trip or project to auto-generate tasks.</p>
            </div>
          )}

          <div className="flex justify-around pt-3 border-t border-slate-800 text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> To Do
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> In Progress
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Done
            </span>
          </div>
        </Card>

        {/* Priority Distribution Bar Chart */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-200">Workload by Priority</h3>
            <span className="text-xs text-slate-400">Active Allocations</span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.charts?.priorityDistribution || []}>
                <XAxis dataKey="priority" stroke="#64748B" fontSize={12} tickLine={false} />
                <YAxis stroke="#64748B" fontSize={12} allowDecimals={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{ backgroundColor: '#1E293B', border: '1px solid #334155', borderRadius: '8px' }}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Two Column Layout: Deadlines & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Deadlines */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-200">Upcoming Deadlines</h3>
            </div>
            <Link to="/tasks" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">View all</Link>
          </div>

          {data?.upcomingDeadlines && data.upcomingDeadlines.length > 0 ? (
            <div className="space-y-3">
              {data.upcomingDeadlines.map((t) => (
                <div key={t._id} className="flex items-center justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                  <div className="space-y-0.5 truncate pr-2">
                    <p className="text-sm font-medium text-slate-200 truncate">{t.title}</p>
                    <p className="text-xs text-slate-500">
                      Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'No date'}
                    </p>
                  </div>
                  <Badge variant={t.priority === 'Urgent' ? 'danger' : t.priority === 'High' ? 'warning' : 'primary'}>
                    {t.priority}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No pressing deadlines for the next few days. You are all caught up!
            </div>
          )}
        </Card>

        {/* Recent AI Activities & Notifications */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-violet-400" />
              <h3 className="text-sm font-semibold text-slate-200">Recent Orchestration Log</h3>
            </div>
            <Link to="/notifications" className="text-xs text-indigo-400 hover:text-indigo-300 font-medium">Full log</Link>
          </div>

          {activities.length > 0 ? (
            <div className="space-y-3">
              {activities.slice(0, 4).map((act) => (
                <div key={act._id} className="flex items-start gap-3 p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                  <div className="w-2 h-2 rounded-full bg-indigo-500 mt-2 shrink-0" />
                  <div className="space-y-0.5 truncate flex-1">
                    <p className="text-sm font-medium text-slate-200">{act.title}</p>
                    <p className="text-xs text-slate-400 truncate">{act.message}</p>
                    <span className="text-[10px] text-slate-500">{new Date(act.createdAt).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No recent notifications. Start interacting with the AI assistant to see logged actions.
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

