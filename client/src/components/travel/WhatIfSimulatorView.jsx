import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  GitCompare,
  TrendingUp,
  TrendingDown,
  Calendar,
  Users,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  Check,
  X,
  Trash2,
  RefreshCw,
  Loader2,
  ArrowRight,
  ShieldAlert,
  Zap,
  RotateCcw
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const WhatIfSimulatorView = ({ trip, onTripUpdated }) => {
  const [scenarios, setScenarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [customPrompt, setCustomPrompt] = useState('');
  const [scenarioTitle, setScenarioTitle] = useState('');
  const [isSimulating, setIsSimulating] = useState(false);
  const [applyingId, setApplyingId] = useState(null);
  const [restoringOriginal, setRestoringOriginal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [activeCompareIds, setActiveCompareIds] = useState([]);

  useEffect(() => {
    if (trip?._id) {
      loadScenarios();
    }
  }, [trip?._id]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await tripsAPI.getScenarios(trip._id);
      const list = res.data.scenarios || [];
      setScenarios(list);
      // Default to comparing first 2 scenarios
      if (list.length > 0) {
        setActiveCompareIds(list.slice(0, 2).map(s => s._id));
      }
    } catch (err) {
      console.error('Failed to load scenarios:', err);
      setErrorMsg('Failed to load saved scenarios.');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async (promptText, nameText) => {
    const query = promptText || customPrompt;
    if (!query || !query.trim()) {
      setErrorMsg('Please enter a simulation question or select a preset.');
      return;
    }

    setIsSimulating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await tripsAPI.createScenario(trip._id, {
        scenarioQuery: query.trim(),
        name: nameText || scenarioTitle || `Simulation: ${query.slice(0, 32)}`
      });

      setSuccessMsg(`Simulated "${res.data.scenario.name}" successfully!`);
      setCustomPrompt('');
      setScenarioTitle('');
      await loadScenarios();
    } catch (err) {
      console.error('Simulation failed:', err);
      setErrorMsg(err.response?.data?.message || 'Simulation failed. Please try again.');
    } finally {
      setIsSimulating(false);
    }
  };

  const handleApplyScenario = async (scenarioId, scenarioName) => {
    if (!window.confirm(`Apply scenario "${scenarioName}" to your primary itinerary? (Your original itinerary will be safely backed up so you can restore anytime).`)) {
      return;
    }

    setApplyingId(scenarioId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await tripsAPI.applyScenario(trip._id, scenarioId);
      setSuccessMsg(res.data.message);
      if (onTripUpdated) onTripUpdated(res.data.trip);
      await loadScenarios();
    } catch (err) {
      console.error('Failed to apply scenario:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to apply scenario.');
    } finally {
      setApplyingId(null);
    }
  };

  const handleRestoreOriginal = async () => {
    if (!window.confirm('Restore your original itinerary and budget?')) return;

    setRestoringOriginal(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const res = await tripsAPI.restoreOriginal(trip._id);
      setSuccessMsg('Original trip plan restored successfully!');
      if (onTripUpdated) onTripUpdated(res.data.trip);
      await loadScenarios();
    } catch (err) {
      console.error('Failed to restore original plan:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to restore original itinerary.');
    } finally {
      setRestoringOriginal(false);
    }
  };

  const handleDeleteScenario = async (scenarioId) => {
    try {
      await tripsAPI.deleteScenario(trip._id, scenarioId);
      setScenarios(prev => prev.filter(s => s._id !== scenarioId));
      setActiveCompareIds(prev => prev.filter(id => id !== scenarioId));
    } catch (err) {
      console.error('Failed to delete scenario:', err);
    }
  };

  const toggleCompareId = (id) => {
    setActiveCompareIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id].slice(-2)
    );
  };

  const quickPresets = [
    { label: '📅 Extend to 7 Days', query: 'Extend the trip to 7 days with nature safari and hinterlands', name: '7-Day Extended Trip' },
    { label: '💰 Budget Cut to ₹10k/person', query: 'Reduce budget to 10000 per person and use budget stays', name: 'Budget Optimization Cut' },
    { label: '🌧️ What if it Rains on Day 2?', query: 'What if it rains on Day 2? Plan indoor museum and cafe contingencies', name: 'Rainy Day Contingency' },
    { label: '👥 Add 2 More Friends', query: 'Add two more friends to the trip and calculate shared villa budget', name: 'Group Expansion (+2 Friends)' },
    { label: '✈️ Upgrade Train to Flight', query: 'Upgrade train travel to flight to save transit time', name: 'Express Flight Upgrade' },
    { label: '⚡ Remove Final Day', query: 'What happens if we remove one day and compress activities?', name: 'Compressed Fast-Track' }
  ];

  const comparedScenarios = scenarios.filter(s => activeCompareIds.includes(s._id));

  return (
    <div className="space-y-6">
      {/* Top Banner & Scenario Creator */}
      <Card className="p-5 border-indigo-500/30 bg-gradient-to-r from-slate-900 via-indigo-950/20 to-purple-950/20 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <GitCompare size={22} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                What-If Trip Simulator
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  AI Simulation Engine
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Experiment with alternative dates, budgets, group sizes, or weather contingencies without touching your original plan.
              </p>
            </div>
          </div>

          {trip.originalTripData && (
            <button
              onClick={handleRestoreOriginal}
              disabled={restoringOriginal}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-2 border border-slate-700 transition"
            >
              {restoringOriginal ? <Loader2 size={14} className="animate-spin" /> : <RotateCcw size={14} />}
              Restore Original Plan
            </button>
          )}
        </div>

        {/* Quick Presets */}
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">Simulate Common What-If Scenarios:</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {quickPresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSimulate(preset.query, preset.name)}
                disabled={isSimulating}
                className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-left text-xs text-slate-200 transition group"
              >
                <div className="font-semibold text-white group-hover:text-indigo-400">{preset.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom What-if query */}
        <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder="Ask anything: 'What if we add Mumbai?', 'What if budget is cut by 20%?'..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            onClick={() => handleSimulate()}
            disabled={isSimulating || !customPrompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 font-bold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition disabled:opacity-50 whitespace-nowrap"
          >
            {isSimulating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {isSimulating ? 'Simulating Alternative Plan...' : 'Run Simulation'}
          </button>
        </div>
      </Card>

      {successMsg && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Scenario Selector & Comparison Controls */}
      {scenarios.length > 0 && (
        <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400">Select to compare:</span>
            {scenarios.map(sc => {
              const isSelected = activeCompareIds.includes(sc._id);
              return (
                <button
                  key={sc._id}
                  onClick={() => toggleCompareId(sc._id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600/20 border-indigo-500 text-indigo-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-indigo-400' : 'bg-slate-600'}`} />
                  {sc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* SCENARIO COMPARISON DASHBOARD (Original Plan | Scenario A | Scenario B) */}
      <div className="space-y-4">
        <h4 className="text-sm font-bold text-white flex items-center gap-2">
          <GitCompare size={16} className="text-indigo-400" />
          Comparative Dashboard: Original Plan vs Simulated Scenarios
        </h4>

        <div className={`grid grid-cols-1 ${comparedScenarios.length === 1 ? 'md:grid-cols-2' : (comparedScenarios.length >= 2 ? 'md:grid-cols-3' : 'md:grid-cols-1')} gap-4`}>
          {/* COLUMN 1: ORIGINAL PLAN */}
          <Card className="p-5 border-slate-800 bg-slate-900/80 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Baseline Plan</span>
                <h4 className="text-sm font-bold text-white">{trip.name}</h4>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Active Itinerary
              </span>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Total Budget</span>
                <span className="font-bold text-white text-sm">₹{trip.totalBudget?.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Per Person</span>
                <span className="font-bold text-white text-sm">₹{Math.round(trip.totalBudget / Math.max(1, trip.travelersCount || 1)).toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Duration</span>
                <span className="font-bold text-white text-sm">{trip.durationDays} Days</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <span className="text-[11px] text-slate-400 block">Travelers</span>
                <span className="font-bold text-white text-sm">{trip.travelersCount || 1} Persons</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Feasibility Score</span>
                <span className="font-bold text-emerald-400">{trip.feasibilityScore || 85}/100</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${trip.feasibilityScore || 85}%` }} />
              </div>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <span className="font-semibold text-slate-400 text-[11px] block">Key Activities ({trip.itinerary?.reduce((acc, d) => acc + (d.activities?.length || 0), 0)} stops):</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                {trip.itinerary?.slice(0, 3).map((d, i) => (
                  <li key={i}>{d.title}</li>
                ))}
              </ul>
            </div>
          </Card>

          {/* SIMULATED SCENARIO COLUMNS */}
          {comparedScenarios.map((scenario) => {
            const costDiff = scenario.costDifference || 0;
            const isMore = costDiff > 0;
            const isApplied = scenario.isApplied;

            return (
              <Card
                key={scenario._id}
                className={`p-5 space-y-4 border transition ${
                  isApplied ? 'border-emerald-500/40 bg-emerald-950/10' : 'border-indigo-500/30 bg-slate-900/90'
                }`}
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">Simulated Alternative</span>
                    <h4 className="text-sm font-bold text-white">{scenario.name}</h4>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isApplied ? (
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        Applied
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/20 text-indigo-300">
                        Simulation
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteScenario(scenario._id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition"
                      title="Delete Scenario"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Metrics with Deltas */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Proposed Budget</span>
                    <span className="font-bold text-white text-sm">₹{scenario.proposedBudget?.toLocaleString('en-IN')}</span>
                    <span className={`text-[10px] font-bold block ${isMore ? 'text-amber-400' : (costDiff < 0 ? 'text-emerald-400' : 'text-slate-400')}`}>
                      {isMore ? `+₹${costDiff.toLocaleString('en-IN')}` : (costDiff < 0 ? `-₹${Math.abs(costDiff).toLocaleString('en-IN')}` : 'Same cost')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Per Person</span>
                    <span className="font-bold text-white text-sm">₹{scenario.costPerPerson?.toLocaleString('en-IN')}</span>
                    <span className="text-[10px] text-slate-400 block">
                      Across {scenario.changes?.travelers?.proposed || trip.travelersCount || 1} people
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Duration</span>
                    <span className="font-bold text-white text-sm">{scenario.proposedDuration} Days</span>
                    <span className="text-[10px] font-bold text-indigo-400 block">
                      {scenario.proposedDuration - scenario.originalDuration > 0
                        ? `+${scenario.proposedDuration - scenario.originalDuration} days`
                        : (scenario.proposedDuration - scenario.originalDuration < 0
                          ? `${scenario.proposedDuration - scenario.originalDuration} days`
                          : 'Same duration')}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                    <span className="text-[11px] text-slate-400 block">Feasibility</span>
                    <span className="font-bold text-emerald-400 text-sm">{scenario.feasibilityScore || 85}/100</span>
                    <span className="text-[10px] text-slate-400 uppercase block">{scenario.feasibility?.replace('_', ' ')}</span>
                  </div>
                </div>

                {/* Advantages */}
                {scenario.advantages && scenario.advantages.length > 0 && (
                  <div className="p-2.5 rounded-xl bg-emerald-950/20 border border-emerald-500/20 text-xs space-y-1">
                    <span className="font-bold text-emerald-400 text-[11px]">✨ Advantages:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                      {scenario.advantages.map((adv, i) => (
                        <li key={i}>{adv}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Disadvantages / Risks */}
                {(scenario.disadvantages?.length > 0 || scenario.warnings?.length > 0) && (
                  <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/20 text-xs space-y-1">
                    <span className="font-bold text-amber-400 text-[11px]">⚠️ Trade-offs & Risks:</span>
                    <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-slate-300">
                      {[...(scenario.disadvantages || []), ...(scenario.warnings || [])].slice(0, 3).map((warn, i) => (
                        <li key={i}>{warn}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Apply Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleApplyScenario(scenario._id, scenario.name)}
                    disabled={applyingId === scenario._id || isApplied}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
                      isApplied
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 cursor-default'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20'
                    }`}
                  >
                    {applyingId === scenario._id ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : (
                      isApplied ? <CheckCircle2 size={15} /> : <Check size={15} />
                    )}
                    {isApplied ? 'Currently Applied' : 'Apply Scenario to Itinerary'}
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};

