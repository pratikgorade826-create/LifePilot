import React from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  Plane,
  FolderKanban,
  FileText,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Zap,
  BarChart3,
  Bot
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const Landing = () => {
  const { isAuthenticated } = useAuthStore();

  const capabilities = [
    {
      icon: Plane,
      color: 'from-blue-500 to-indigo-500',
      title: 'Smart Travel Planning',
      desc: 'Generate day-wise itineraries, estimated budgets across food & stay, packing checklists, and printable trip reports from simple prompts.'
    },
    {
      icon: FolderKanban,
      color: 'from-purple-500 to-violet-500',
      title: 'AI Project Roadmaps',
      desc: 'Convert ideas into actionable milestone timelines, breakdown complex tasks, track progress percentages, and manage work on Kanban boards.'
    },
    {
      icon: FileText,
      color: 'from-emerald-500 to-cyan-500',
      title: 'Personal Knowledge Hub',
      desc: 'Upload PDF, DOCX, and TXT files. Extract executive summaries, query content with source chunk citations, and convert action items to tasks.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-100 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-20 border-b border-slate-800/80 px-6 sm:px-12 flex items-center justify-between max-w-7xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Sparkles size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            LifePilot <span className="text-indigo-400 font-extrabold text-sm px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">AI</span>
          </span>
        </div>

        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
            >
              Go to Dashboard
              <ArrowRight size={16} />
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-5 py-2.5 rounded-xl font-medium text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-md shadow-indigo-500/20 transition flex items-center gap-2"
              >
                Get Started Free
                <ArrowRight size={16} />
              </Link>
            </>
          )}
        </div>
      </header>

      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-16 sm:py-24 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-8 animate-fade-in">
          <Zap size={14} className="text-indigo-400" />
          <span>Everyday Assistance Hackathon Edition</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-tight">
          Think Less. Organize Better.{' '}
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
            Get Things Done.
          </span>
        </h1>

        <p className="text-base sm:text-xl text-slate-400 max-w-2xl mb-10 leading-relaxed">
          The unified intelligent copilot that merges <strong>smart travel planning</strong>, <strong>AI project roadmaps</strong>, and <strong>document intelligence</strong> under one shared orchestration engine.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 w-full justify-center max-w-md">
          <Link
            to={isAuthenticated ? "/dashboard" : "/register"}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl font-semibold text-sm bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-xl shadow-indigo-500/25 transition flex items-center justify-center gap-2"
          >
            Launch LifePilot
            <ArrowRight size={18} />
          </Link>

          <Link
            to={isAuthenticated ? "/assistant" : "/login"}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-medium text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 transition flex items-center justify-center gap-2"
          >
            <Bot size={18} className="text-indigo-400" />
            Try AI Assistant
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 text-left w-full">
          {capabilities.map((cap, i) => {
            const Icon = cap.icon;
            return (
              <div
                key={i}
                className="p-6 rounded-2xl bg-[#111827] border border-slate-800/80 hover:border-indigo-500/40 transition duration-300 relative group overflow-hidden"
              >
                <div className={`w-12 h-12 rounded-xl bg-gradient-to-tr ${cap.color} flex items-center justify-center text-white mb-5 shadow-lg shadow-indigo-500/10`}>
                  <Icon size={24} />
                </div>
                <h3 className="text-lg font-semibold text-slate-100 mb-2">{cap.title}</h3>
                <p className="text-sm text-slate-400 leading-relaxed">{cap.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Unified Flow Explainer */}
        <div className="mt-16 w-full p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-indigo-950/20 to-slate-900/60 border border-indigo-500/20 text-center">
          <span className="text-xs uppercase tracking-widest text-indigo-400 font-bold">The Orchestration Loop</span>
          <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-4 mt-4 text-xs sm:text-sm font-semibold text-slate-300">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700">User Natural Request</span>
            <span className="text-indigo-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-indigo-500/10 text-indigo-300 border border-indigo-500/30">AI Intent Detection</span>
            <span className="text-indigo-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/30">Specialized AI Workflow</span>
            <span className="text-indigo-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Structured Result</span>
            <span className="text-indigo-400">→</span>
            <span className="px-3 py-1.5 rounded-lg bg-violet-600 text-white">User Approval & Persistence</span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-8 text-center text-xs text-slate-500">
        <p>© 2026 LifePilot AI. Everyday Assistance Hackathon. Built with Node.js, React, and MongoDB.</p>
      </footer>
    </div>
  );
};
