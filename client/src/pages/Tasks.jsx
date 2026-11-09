import React, { useEffect, useState } from 'react';
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Calendar,
  Clock,
  Trash2,
  CheckCircle2,
  Circle,
  Tag,
  ArrowUpDown,
  Sparkles
} from 'lucide-react';
import { tasksAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Tasks = () => {
  const [tasks, setTasks] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [showModal, setShowModal] = useState(false);

  // New task form
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'Medium',
    status: 'To Do',
    dueDate: '',
    estimatedDuration: '1 hour',
    originType: 'MANUAL'
  });

  useEffect(() => {
    loadTasks();
  }, [statusFilter, priorityFilter, originFilter, search]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (originFilter) params.originType = originFilter;
      if (search) params.search = search;

      const res = await tasksAPI.getAll(params);
      setTasks(res.data.tasks || []);
      setCounts(res.data.counts || {});
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (taskId, currentStatus) => {
    const nextStatus = currentStatus === 'Completed' ? 'To Do' : 'Completed';
    try {
      await tasksAPI.updateStatus(taskId, nextStatus);
      loadTasks();
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await tasksAPI.delete(taskId);
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      await tasksAPI.create({
        ...newTask,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate) : null
      });
      setShowModal(false);
      setNewTask({
        title: '',
        description: '',
        priority: 'Medium',
        status: 'To Do',
        dueDate: '',
        estimatedDuration: '1 hour',
        originType: 'MANUAL'
      });
      loadTasks();
    } catch (err) {
      console.error('Task creation failed:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckSquare size={22} className="text-indigo-400" />
            Central Task Manager
          </h1>
          <p className="text-xs text-slate-400">
            Unified task hub aggregating tasks from projects, trips, documents, and AI requests.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 transition self-start sm:self-auto"
        >
          <Plus size={16} /> Create Task
        </button>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 w-full">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search tasks by title or details..."
              className="w-full pl-9 pr-4 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
            {[
              { id: '', label: `All (${counts.total || 0})` },
              { id: 'To Do', label: `To Do (${counts.todo || 0})` },
              { id: 'In Progress', label: `In Progress (${counts.inProgress || 0})` },
              { id: 'Completed', label: `Done (${counts.completed || 0})` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setStatusFilter(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  statusFilter === tab.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-[#0B0F19] text-slate-400 hover:text-white border border-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Priority & Origin filters */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800 text-xs">
          <span className="text-slate-500 font-medium flex items-center gap-1">
            <Filter size={12} /> Filters:
          </span>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={originFilter}
            onChange={(e) => setOriginFilter(e.target.value)}
            className="px-2.5 py-1 rounded-lg bg-[#0B0F19] border border-slate-800 text-slate-300 focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Origins</option>
            <option value="PROJECT">Projects</option>
            <option value="TRIP">Trips</option>
            <option value="DOCUMENT">Documents</option>
            <option value="AI_ASSISTANT">AI Assistant</option>
            <option value="MANUAL">Manual</option>
          </select>

          {(statusFilter || priorityFilter || originFilter || search) && (
            <button
              onClick={() => {
                setStatusFilter('');
                setPriorityFilter('');
                setOriginFilter('');
                setSearch('');
              }}
              className="text-xs text-indigo-400 hover:text-indigo-300 ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </Card>

      {/* Task List */}
      {loading ? (
        <LoadingSpinner label="Loading tasks..." />
      ) : tasks.length > 0 ? (
        <div className="space-y-2.5">
          {tasks.map((task) => {
            const isCompleted = task.status === 'Completed';
            return (
              <Card
                key={task._id}
                className={`p-4 flex items-center justify-between transition group ${
                  isCompleted ? 'bg-[#0E131F]/60 border-slate-800/50 opacity-70' : ''
                }`}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 pr-4">
                  <button
                    onClick={() => handleStatusToggle(task._id, task.status)}
                    className="p-1 text-slate-500 hover:text-indigo-400 transition shrink-0"
                  >
                    {isCompleted ? (
                      <CheckCircle2 size={18} className="text-emerald-400" />
                    ) : (
                      <Circle size={18} className="text-slate-600 hover:text-indigo-400" />
                    )}
                  </button>

                  <div className="space-y-0.5 truncate">
                    <p className={`text-sm font-semibold truncate ${isCompleted ? 'line-through text-slate-400' : 'text-slate-200'}`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-xs text-slate-400 truncate">{task.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 pt-0.5">
                      {task.dueDate && (
                        <span className="flex items-center gap-1">
                          <Calendar size={11} /> {new Date(task.dueDate).toLocaleDateString()}
                        </span>
                      )}
                      {task.originLabel && (
                        <span className="text-indigo-400 font-medium truncate max-w-[150px]">
                          from {task.originLabel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
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

                  <span className="text-[10px] uppercase font-bold text-slate-500 hidden sm:inline px-2 py-0.5 rounded bg-slate-800">
                    {task.originType}
                  </span>

                  <button
                    onClick={() => handleDelete(task._id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition opacity-0 group-hover:opacity-100"
                    title="Delete task"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          icon={CheckSquare}
          title="No Tasks Found"
          description="Everything is clear! Create a manual task or let LifePilot AI draft tasks from your trips and projects."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Add a Task
            </button>
          }
        />
      )}

      {/* Task Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-sm font-bold text-white">Add New Task</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  placeholder="e.g. Complete database design"
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description (Optional)</label>
                <textarea
                  rows={2}
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  placeholder="Additional context or notes..."
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={newTask.priority}
                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Due Date</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
                >
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

