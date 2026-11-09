import React, { useEffect, useState } from 'react';
import {
  Columns3,
  Plus,
  ArrowRight,
  ArrowLeft,
  Clock,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Tag
} from 'lucide-react';
import { tasksAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Kanban = () => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [priorityFilter, setPriorityFilter] = useState('ALL');

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const res = await tasksAPI.getAll();
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load Kanban tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const moveTask = async (taskId, newStatus) => {
    try {
      await tasksAPI.updateStatus(taskId, newStatus);
      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err) {
      console.error('Failed to move task:', err);
    }
  };

  const filteredTasks = tasks.filter((t) => {
    if (priorityFilter !== 'ALL' && t.priority !== priorityFilter) return false;
    return true;
  });

  const columns = [
    {
      id: 'To Do',
      title: 'To Do',
      color: 'border-blue-500/40',
      badgeColor: 'primary',
      tasks: filteredTasks.filter((t) => t.status === 'To Do')
    },
    {
      id: 'In Progress',
      title: 'In Progress',
      color: 'border-amber-500/40',
      badgeColor: 'warning',
      tasks: filteredTasks.filter((t) => t.status === 'In Progress')
    },
    {
      id: 'Completed',
      title: 'Completed',
      color: 'border-emerald-500/40',
      badgeColor: 'success',
      tasks: filteredTasks.filter((t) => t.status === 'Completed')
    }
  ];

  if (loading) {
    return <LoadingSpinner label="Loading Kanban board..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Columns3 size={22} className="text-indigo-400" />
            Kanban Task Board
          </h1>
          <p className="text-xs text-slate-400">
            Interactive task workflow across all projects, trips, and document action items.
          </p>
        </div>

        {/* Priority Filter */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-medium">Filter Priority:</span>
          {['ALL', 'Urgent', 'High', 'Medium', 'Low'].map((p) => (
            <button
              key={p}
              onClick={() => setPriorityFilter(p)}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
                priorityFilter === p
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {columns.map((col) => (
          <div
            key={col.id}
            className={`bg-[#0E131F] border ${col.color} rounded-2xl p-4 flex flex-col min-h-[500px] shadow-lg`}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">{col.title}</h3>
                <span className="w-5 h-5 rounded-full bg-slate-800 text-[11px] font-bold text-slate-300 flex items-center justify-center">
                  {col.tasks.length}
                </span>
              </div>
            </div>

            {/* Task Cards */}
            <div className="space-y-3 flex-1 overflow-y-auto">
              {col.tasks.length > 0 ? (
                col.tasks.map((task) => (
                  <Card key={task._id} className="p-4 space-y-3 hover:border-slate-700 transition">
                    <div className="flex items-center justify-between">
                      <Badge
                        variant={
                          task.priority === 'Urgent'
                            ? 'danger'
                            : task.priority === 'High'
                            ? 'warning'
                            : 'primary'
                        }
                      >
                        {task.priority}
                      </Badge>
                      {task.originType && (
                        <span className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">
                          {task.originType}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-slate-200">{task.title}</h4>
                      {task.description && (
                        <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                          {task.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-800/80">
                      <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No date'}</span>
                      {task.originLabel && <span className="truncate max-w-[100px]">{task.originLabel}</span>}
                    </div>

                    {/* Quick Move Buttons */}
                    <div className="flex items-center justify-between pt-1">
                      {col.id !== 'To Do' && (
                        <button
                          onClick={() => moveTask(task._id, col.id === 'Completed' ? 'In Progress' : 'To Do')}
                          className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition"
                        >
                          <ArrowLeft size={12} /> Move back
                        </button>
                      )}
                      {col.id === 'To Do' && <div />}
                      {col.id !== 'Completed' && (
                        <button
                          onClick={() => moveTask(task._id, col.id === 'To Do' ? 'In Progress' : 'Completed')}
                          className="flex items-center gap-1 text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 transition ml-auto"
                        >
                          Next <ArrowRight size={12} />
                        </button>
                      )}
                    </div>
                  </Card>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800/80 rounded-xl">
                  No tasks in {col.title}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

