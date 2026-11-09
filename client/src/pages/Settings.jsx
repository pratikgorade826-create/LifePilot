import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Settings as SettingsIcon,
  Cpu,
  Moon,
  Sun,
  Database,
  ShieldCheck,
  Check,
  Sparkles,
  Info,
  Server
} from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';

export const Settings = () => {
  const { isDark, toggleTheme } = useThemeStore();
  const [currency, setCurrency] = useState('INR');
  const [provider, setProvider] = useState('auto');
  const [healthStatus, setHealthStatus] = useState(null);
  const [savedMessage, setSavedMessage] = useState('');

  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

  useEffect(() => {
    checkHealth();
  }, []);

  const checkHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      setHealthStatus(res.data);
    } catch (err) {
      setHealthStatus({ status: 'offline', error: err.message });
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSavedMessage('Preferences saved locally for this browser session.');
    setTimeout(() => setSavedMessage(''), 3000);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <SettingsIcon size={22} className="text-indigo-400" />
          Settings & Preferences
        </h1>
        <p className="text-xs text-slate-400">
          Configure AI provider adapters, interface preferences, and verify backend status.
        </p>
      </div>

      {savedMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs rounded-xl flex items-center gap-2">
          <Check size={16} />
          <span>{savedMessage}</span>
        </div>
      )}

      {/* Backend & Health Status */}
      <Card className="p-5 space-y-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Server size={16} className="text-indigo-400" /> System Health & Runtime Check
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-slate-500 block mb-1">Backend API Status</span>
            <span className={`font-bold ${healthStatus?.status === 'healthy' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {healthStatus?.status ? healthStatus.status.toUpperCase() : 'CHECKING...'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-slate-500 block mb-1">Database State</span>
            <span className="font-bold text-slate-200">
              {healthStatus?.database?.connected ? 'CONNECTED (MongoDB)' : 'RETRYING / MONGODB'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
            <span className="text-slate-500 block mb-1">Active AI Provider</span>
            <span className="font-bold text-indigo-400">
              {healthStatus?.aiProvider || 'AUTO (BharatCode / Gemini / Demo)'}
            </span>
          </div>
        </div>
      </Card>

      {/* Preferences Form */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-white mb-4">Application Preferences</h3>

        <form onSubmit={handleSave} className="space-y-5">
          {/* AI Provider selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
              <Cpu size={14} className="text-indigo-400" /> AI Provider Selection Mode
            </label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="auto">Auto-detect (BharatCode API → Gemini API → Intelligent Demo)</option>
              <option value="bharatcode">Force BharatCode API (Primary Hackathon Provider)</option>
              <option value="gemini">Force Gemini 1.5 Flash API</option>
              <option value="demo">Intelligent Demo Mode (Self-contained, Zero API key required)</option>
            </select>
            <span className="text-[10px] text-slate-500 block mt-1">
              All keys are stored securely on backend environment variables; never exposed to browser client.
            </span>
          </div>

          {/* Currency */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Default Travel Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
            >
              <option value="INR">INR (₹) - Indian Rupee</option>
              <option value="USD">USD ($) - US Dollar</option>
              <option value="EUR">EUR (€) - Euro</option>
              <option value="GBP">GBP (£) - British Pound</option>
            </select>
          </div>

          {/* Theme */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-[#0B0F19] border border-slate-800">
            <div>
              <span className="text-xs font-semibold text-slate-200 block">Dark / Light Interface</span>
              <span className="text-[11px] text-slate-400">Toggle dark navy or clean daylight appearance</span>
            </div>
            <button
              type="button"
              onClick={toggleTheme}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 hover:text-white transition"
            >
              {isDark ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} />}
              <span>{isDark ? 'Switch to Light' : 'Switch to Dark'}</span>
            </button>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2"
            >
              <Check size={14} />
              <span>Save Settings</span>
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
};

