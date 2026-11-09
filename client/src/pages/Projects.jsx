import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Sparkles,
  Calendar,
  Clock,
  ArrowRight,
  Trash2,
  Loader2,
  CheckCircle2,
  BarChart2
} from 'lucide-react';
import { projectsAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: 'College Web Application',
    description: 'Build a full stack web application with user authentication, dashboard analytics, and REST APIs.',
    category: 'Development',
    priority: 'High',
    durationDays: 10,
    availableWorkingHours: 20
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getAll();
      setProjects(res.data.projects || []);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAndSave = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Step 1: AI project decomposition
      const genRes = await projectsAPI.generate(formData);
      const generated = genRes.data.data;

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (formData.durationDays || 10));

      // Step 2: Persist in MongoDB with initial tasks
      const saveRes = await projectsAPI.create({
        name: formData.name || generated.name,
        description: formData.description || generated.description,
        category: formData.category || generated.category,
        priority: formData.priority || generated.priority,
        durationDays: formData.durationDays,
        availableWorkingHours: formData.availableWorkingHours,
        deadline,
        objectives: generated.objectives || [],
        milestones: generated.milestones || [],
        completionChecklist: generated.completionChecklist || [],
        initialTasks: generated.tasks || [],
        isAiGenerated: true
      });

      setShowModal(false);
      loadProjects();
      navigate(`/projects/${saveRes.data.project._id}`);
    } catch (err) {
      console.error('Failed to create project:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Delete this project and all linked tasks?')) return;
    try {
      await projectsAPI.delete(id);
      setProjects((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your project roadmaps..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FolderKanban size={22} className="text-purple-400" />
            AI Project Organizer
          </h1>
          <p className="text-xs text-slate-400">
            Convert ideas into structured milestone roadmaps and actionable tasks.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition self-start sm:self-auto"
        >
          <Sparkles size={16} /> Generate Project from Idea
        </button>
      </div>

      {/* Projects Grid */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((proj) => (
            <Link key={proj._id} to={`/projects/${proj._id}`} className="group block">
              <Card hover className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant={proj.priority === 'Urgent' ? 'danger' : proj.priority === 'High' ? 'warning' : 'violet'}>
                      {proj.priority} Priority
                    </Badge>
                    <button
                      onClick={(e) => handleDelete(e, proj._id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100"
                      title="Delete project"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-purple-400 transition">
                    {proj.name}
                  </h3>
                  <span className="text-[11px] text-slate-400 font-medium block mb-3">{proj.category}</span>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {proj.description || 'Structured project roadmap and milestone deliverables.'}
                  </p>

                  {/* Progress Bar */}
                  <div className="space-y-1.5 py-3 border-y border-slate-800">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400">Progress</span>
                      <span className="text-white font-bold">{proj.progress || 0}%</span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-300"
                        style={{ width: `${proj.progress || 0}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                      <span>{proj.completedTasks || 0} / {proj.totalTasks || 0} Tasks Done</span>
                      <span>{proj.milestones?.length || 0} Milestones</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold text-purple-400">
                  <span>Open Roadmap</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FolderKanban}
          title="No Projects Active"
          description="Transform any goal or concept into structured milestones and tasks."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition"
            >
              Organize Your First Project
            </button>
          }
        />
      )}

      {/* AI Project Idea Decomposition Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Deconstruct Project with AI</h3>
                  <p className="text-xs text-slate-400">Input your goal to generate milestones & tasks</p>
                </div>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-white text-sm">✕</button>
            </div>

            <form onSubmit={handleGenerateAndSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Project Concept / Description</label>
                <textarea
                  rows={3}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Explain what you want to achieve..."
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {['Development', 'Design', 'Marketing', 'Academics', 'Personal', 'Business'].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Priority</label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  >
                    {['Low', 'Medium', 'High', 'Urgent'].map((p) => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Target Timeline (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="365"
                    required
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value, 10) || 7 })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Weekly Budgeted Hours</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={formData.availableWorkingHours}
                    onChange={(e) => setFormData({ ...formData, availableWorkingHours: parseInt(e.target.value, 10) || 20 })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-lg shadow-purple-500/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating ? 'Structuring Roadmap...' : 'Generate Roadmap'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
