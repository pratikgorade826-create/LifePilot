import React, { useState, useEffect } from 'react';
import {
  CheckSquare,
  Square,
  Plus,
  Calendar,
  User,
  Clock,
  Loader2,
  Trash2,
  Activity,
  CheckCircle2,
  X,
  AlertCircle
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const TripTasksView = ({ trip, currentUser }) => {
  const [tasks, setTasks] = useState([]);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('tasks'); // 'tasks' | 'feed'
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const members = trip.members && trip.members.length > 0
    ? trip.members
    : [{ name: currentUser?.name || 'Alex Mercer' }];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Booking');
  const [assignedName, setAssignedName] = useState(currentUser?.name || members[0]?.name || 'Alex Mercer');
  const [deadline, setDeadline] = useState('');
  const [priority, setPriority] = useState('Medium');

  useEffect(() => {
    if (trip?._id) {
      loadTasksAndActivity();
    }
  }, [trip?._id]);

  const loadTasksAndActivity = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [tasksRes, actRes] = await Promise.all([
        tripsAPI.getTasks(trip._id),
        tripsAPI.getActivityFeed(trip._id)
      ]);
      setTasks(tasksRes.data.tasks || []);
      setActivities(actRes.data.activities || []);
    } catch (err) {
      console.error('Failed to load tasks/activity:', err);
      setErrorMsg('Failed to load tasks and activity feed.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      await tripsAPI.updateTask(trip._id, task._id, { status: newStatus });
      setTasks(prev => prev.map(t => t._id === task._id ? { ...t, status: newStatus } : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleDeleteTask = async (taskId) => {
    try {
      await tripsAPI.deleteTask(trip._id, taskId);
      setTasks(prev => prev.filter(t => t._id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMsg('Task title is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const assignedMem = members.find(m => m.name === assignedName);
      const res = await tripsAPI.createTask(trip._id, {
        title: title.trim(),
        category,
        assignedTo: {
          userId: assignedMem?.userId,
          userName: assignedName
        },
        deadline: deadline || null,
        priority
      });

      setSuccessMsg(`Task "${res.data.task.title}" assigned to ${assignedName}!`);
      setShowAddModal(false);
      setTitle('');
      setDeadline('');
      await loadTasksAndActivity();
    } catch (err) {
      console.error('Create task error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'completed').length;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/20 border border-indigo-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <CheckSquare size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Pre-Trip Tasks & Live Activity Feed</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Coordinate booking tickets, hotel check-ins, packing research, and real-time event audit logs.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              onClick={() => setViewMode('tasks')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'tasks' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Tasks ({completedCount}/{tasks.length})
            </button>
            <button
              onClick={() => setViewMode('feed')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition ${
                viewMode === 'feed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Activity Feed ({activities.length})
            </button>
          </div>

          {viewMode === 'tasks' && (
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
            >
              <Plus size={15} />
              Add Task
            </button>
          )}
        </div>
      </div>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {loading ? (
        <Card className="flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 size={32} className="animate-spin text-indigo-400 mb-3" />
          <p className="text-sm">Loading tasks and activity feed...</p>
        </Card>
      ) : viewMode === 'tasks' ? (
        /* TASKS VIEW */
        <Card className="p-5 border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white">Collaborative Checklists</h4>
              <p className="text-xs text-slate-400">Assigned preparation and booking duties</p>
            </div>
            <div className="text-xs font-semibold text-slate-400">
              {Math.round((completedCount / Math.max(1, tasks.length)) * 100)}% Complete
            </div>
          </div>

          {tasks.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-6 text-center">No tasks assigned yet. Add one above!</p>
          ) : (
            <div className="space-y-2.5">
              {tasks.map((task) => {
                const isDone = task.status === 'completed';
                return (
                  <div
                    key={task._id}
                    className={`p-3.5 rounded-xl border transition flex items-center justify-between gap-3 text-xs ${
                      isDone
                        ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggleTaskStatus(task)}
                        className={`text-slate-400 hover:text-indigo-400 transition ${isDone ? 'text-emerald-400' : ''}`}
                      >
                        {isDone ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isDone ? 'line-through text-slate-400' : 'text-white'}`}>
                            {task.title}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                            {task.category}
                          </span>
                          {task.priority === 'High' || task.priority === 'Urgent' ? (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-400">
                              {task.priority}
                            </span>
                          ) : null}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span className="flex items-center gap-1">
                            <User size={12} /> Assigned: <strong className="text-slate-300">{task.assignedTo?.userName || 'Member'}</strong>
                          </span>
                          {task.deadline && (
                            <span className="flex items-center gap-1">
                              <Calendar size={12} /> Due: {new Date(task.deadline).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleDeleteTask(task._id)}
                      className="p-1 text-slate-500 hover:text-rose-400 transition"
                      title="Delete Task"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ) : (
        /* ACTIVITY FEED VIEW */
        <Card className="p-5 border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Activity size={16} className="text-indigo-400" />
                Trip Audit & Real-Time Event Log
              </h4>
              <p className="text-xs text-slate-400">Chronological history of all edits, votes, and settlements</p>
            </div>
          </div>

          {activities.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-6 text-center">No activity logged yet.</p>
          ) : (
            <div className="space-y-3">
              {activities.map((act) => (
                <div
                  key={act._id}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-start gap-3 text-xs"
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <div className="flex-1">
                    <p className="text-slate-200 leading-snug">{act.details}</p>
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      {new Date(act.createdAt).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <CheckSquare size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Assign a Trip Task</h3>
                <p className="text-xs text-slate-400">Track deadlines for bookings, research, and logistics</p>
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Task Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Reserve self-drive car at Goa airport"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Booking">Booking & Tickets</option>
                    <option value="Preparation">Preparation & ID</option>
                    <option value="Research">Research & Spots</option>
                    <option value="Packing">Packing List</option>
                    <option value="General">General</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Assignee</label>
                  <select
                    value={assignedName}
                    onChange={(e) => setAssignedName(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    {members.map((m, i) => (
                      <option key={i} value={m.name}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Target Deadline</label>
                  <input
                    type="date"
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white shadow-md shadow-indigo-600/20 transition disabled:opacity-50 flex items-center gap-1.5"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  Assign Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

