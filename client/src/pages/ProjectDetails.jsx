import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FolderKanban,
  Calendar,
  Clock,
  ArrowLeft,
  CheckCircle2,
  Sparkles,
  Trash2,
  Plus,
  Bot,
  Send,
  Loader2,
  CheckSquare,
  Square,
  AlertTriangle
} from 'lucide-react';
import { projectsAPI, tasksAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const ProjectDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'tasks' | 'checklist' | 'assistant'

  // Assistant query state
  const [question, setQuestion] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantAnswers, setAssistantAnswers] = useState([]);

  useEffect(() => {
    loadProject();
  }, [id]);

  const loadProject = async () => {
    try {
      setLoading(true);
      const res = await projectsAPI.getOne(id);
      setProject(res.data.project);
      setTasks(res.data.tasks || []);
    } catch (err) {
      console.error('Failed to load project details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTaskStatusChange = async (taskId, newStatus) => {
    try {
      const res = await tasksAPI.updateStatus(taskId, newStatus);
      const updatedTasks = tasks.map((t) => (t._id === taskId ? res.data.task : t));
      setTasks(updatedTasks);

      // Recalculate progress
      const completed = updatedTasks.filter((t) => t.status === 'Completed').length;
      const progress = updatedTasks.length ? Math.round((completed / updatedTasks.length) * 100) : 0;
      setProject((prev) => ({ ...prev, progress }));
    } catch (err) {
      console.error('Task status update failed:', err);
    }
  };

  const handleAskAssistant = async (customQ = null) => {
    const qToSend = customQ || question;
    if (!qToSend.trim() || assistantLoading) return;

    setAssistantLoading(true);
    setQuestion('');
    try {
      const res = await projectsAPI.askAssistant(id, qToSend);
      setAssistantAnswers((prev) => [
        ...prev,
        {
          question: qToSend,
          answer: res.data.answer,
          createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } catch (err) {
      console.error('Failed to ask assistant:', err);
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this project and its tasks?')) return;
    try {
      await projectsAPI.delete(id);
      navigate('/projects');
    } catch (err) {
      console.error('Delete project failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading project architecture..." />;
  }

  if (!project) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Project not found.</p>
        <Link to="/projects" className="text-purple-400 underline text-sm mt-2 block">Back to Projects</Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/projects')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{project.name}</h1>
              <Badge variant={project.priority === 'Urgent' ? 'danger' : 'violet'}>
                {project.priority} Priority
              </Badge>
              <Badge variant="neutral">{project.category}</Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Calendar size={13} className="text-slate-500" />
              <span>Deadline: {new Date(project.deadline).toLocaleDateString()}</span>
              <span>•</span>
              <Clock size={13} className="text-slate-500" />
              <span>{project.availableWorkingHours || 20} hrs/week</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/kanban')}
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
          >
            Open in Kanban Board
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            title="Delete project"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Progress & Overview Bar */}
      <Card className="bg-[#111827]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div>
            <span className="text-xs font-semibold uppercase text-purple-400 tracking-wider">Overall Progress</span>
            <p className="text-sm text-slate-300 mt-1">{project.description}</p>
          </div>
          <div className="text-right">
            <span className="text-2xl font-bold text-white">{project.progress || 0}%</span>
            <span className="block text-[11px] text-slate-400">
              {tasks.filter((t) => t.status === 'Completed').length} of {tasks.length} tasks completed
            </span>
          </div>
        </div>

        <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 via-indigo-500 to-emerald-500 rounded-full transition-all duration-300"
            style={{ width: `${project.progress || 0}%` }}
          />
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'milestones', label: `Milestones (${project.milestones?.length || 0})` },
          { id: 'tasks', label: `Tasks (${tasks.length})` },
          { id: 'checklist', label: `Signoff Checklist (${project.completionChecklist?.length || 0})` },
          { id: 'assistant', label: 'AI Project Copilot' }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
              activeTab === tab.id
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: MILESTONES */}
      {activeTab === 'milestones' && (
        <div className="space-y-4">
          {project.milestones?.map((m, idx) => (
            <Card key={idx} className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-400 font-bold text-xs flex items-center justify-center shrink-0">
                P{idx + 1}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{m.title}</h3>
                  <Badge variant="violet">Target: Day {m.targetDay || idx * 3 + 2}</Badge>
                </div>
                <p className="text-xs text-slate-400">{m.description}</p>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* TAB 2: TASKS */}
      {activeTab === 'tasks' && (
        <div className="space-y-3">
          {tasks.length > 0 ? (
            tasks.map((task) => (
              <Card key={task._id} className="flex items-center justify-between p-4">
                <div className="space-y-1 pr-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-200">{task.title}</span>
                    <Badge variant={task.priority === 'High' || task.priority === 'Urgent' ? 'danger' : 'primary'}>
                      {task.priority}
                    </Badge>
                  </div>
                  {task.description && <p className="text-xs text-slate-400">{task.description}</p>}
                  <div className="flex items-center gap-3 text-[11px] text-slate-500 pt-1">
                    <span>Est: {task.estimatedDuration}</span>
                    <span>•</span>
                    <span>Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'None'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    onChange={(e) => handleTaskStatusChange(task._id, e.target.value)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-[#0B0F19] border border-slate-700 text-slate-200 focus:outline-none focus:border-purple-500"
                  >
                    <option value="To Do">To Do</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </Card>
            ))
          ) : (
            <div className="p-8 text-center text-xs text-slate-500">
              No tasks created yet for this project.
            </div>
          )}
        </div>
      )}

      {/* TAB 3: COMPLETION CHECKLIST */}
      {activeTab === 'checklist' && (
        <Card className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 mb-2">Quality & Handover Checklist</h3>
          <div className="space-y-2">
            {project.completionChecklist?.map((item, idx) => (
              <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
                <CheckCircle2 size={16} className="text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">{item.item}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: AI PROJECT ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="space-y-4">
          <Card className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-200 mb-1 flex items-center gap-1.5">
                <Bot size={16} className="text-purple-400" /> AI Project Copilot
              </h3>
              <p className="text-xs text-slate-400">
                Ask questions using actual project state (e.g. pending tasks, bottlenecks, deadlines).
              </p>
            </div>

            {/* Quick Prompts */}
            <div className="flex flex-wrap gap-2">
              {[
                'What should I work on today?',
                'Which tasks are blocking my progress?',
                'Summarize my project progress',
                'Create a 7-day completion roadmap'
              ].map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAskAssistant(q)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[#0B0F19] border border-slate-700 hover:border-purple-500/50 text-slate-300 hover:text-white transition"
                >
                  {q}
                </button>
              ))}
            </div>

            {/* Assistant QA stream */}
            <div className="space-y-3 pt-2">
              {assistantAnswers.map((item, idx) => (
                <div key={idx} className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2">
                  <p className="text-xs font-bold text-purple-300">Q: {item.question}</p>
                  <div className="text-xs text-slate-300 whitespace-pre-line leading-relaxed">
                    {item.answer}
                  </div>
                  <span className="text-[10px] text-slate-500 block text-right">{item.createdAt}</span>
                </div>
              ))}

              {assistantLoading && (
                <div className="p-4 rounded-xl bg-[#0B0F19] border border-slate-800 text-xs text-slate-400 flex items-center gap-2">
                  <Loader2 size={14} className="animate-spin text-purple-400" />
                  <span>Analyzing actual project and task database records...</span>
                </div>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleAskAssistant();
              }}
              className="flex gap-2 pt-2 border-t border-slate-800"
            >
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Ask about this project (e.g. 'What is my highest priority task?')..."
                className="flex-1 px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                disabled={assistantLoading || !question.trim()}
                className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-purple-600 hover:bg-purple-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                <Send size={14} /> Ask
              </button>
            </form>
          </Card>
        </div>
      )}
    </div>
  );
};

