import React, { useState, useEffect } from 'react';
import {
  Wallet,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Loader2,
  RefreshCw,
  PieChart as PieIcon,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  DollarSign
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  Legend,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

const CATEGORY_COLORS = {
  Transportation: '#6366f1',
  Accommodation: '#10b981',
  Food: '#f59e0b',
  Activities: '#a855f7',
  Shopping: '#ec4899',
  'Local Transport': '#06b6d4',
  Emergency: '#ef4444',
  Miscellaneous: '#64748b'
};

export const BudgetOptimizerView = ({ trip, onTripUpdated }) => {
  const [budgetData, setBudgetData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [targetBudgetInput, setTargetBudgetInput] = useState(trip?.totalBudget || 30000);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [applyingSavings, setApplyingSavings] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [chartView, setChartView] = useState('bar'); // 'bar' | 'pie'

  useEffect(() => {
    if (trip?._id) {
      loadBudgetAnalysis();
    }
  }, [trip?._id]);

  const loadBudgetAnalysis = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await tripsAPI.getBudget(trip._id);
      setBudgetData(res.data.budget);
      if (res.data.budget?.totalBudget) {
        setTargetBudgetInput(res.data.budget.totalBudget);
      }
    } catch (err) {
      console.error('Failed to load budget analysis:', err);
      setErrorMsg('Failed to load budget analysis.');
    } finally {
      setLoading(false);
    }
  };

  const handleRunOptimization = async (applyDirectly = false) => {
    try {
      if (applyDirectly) setApplyingSavings(true);
      else setIsOptimizing(true);
      setErrorMsg('');
      setSuccessMsg('');

      const res = await tripsAPI.optimizeBudget(trip._id, {
        targetBudget: parseInt(targetBudgetInput, 10),
        applySavings: applyDirectly
      });

      setBudgetData(res.data.optimization);
      if (applyDirectly) {
        setSuccessMsg(`Applied optimized budget of ₹${res.data.optimization.optimizedTotalBudget.toLocaleString('en-IN')}! Saved ₹${res.data.optimization.projectedSavings.toLocaleString('en-IN')}.`);
        if (onTripUpdated) onTripUpdated(res.data.trip);
      } else {
        setSuccessMsg('AI Financial Analysis refreshed successfully.');
      }
    } catch (err) {
      console.error('Budget optimization failed:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to optimize budget.');
    } finally {
      setIsOptimizing(false);
      setApplyingSavings(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 size={32} className="animate-spin text-amber-400 mb-3" />
        <p className="text-sm">Analyzing trip financial allocations & expenses...</p>
      </Card>
    );
  }

  const data = budgetData || {};
  const totalBudget = data.totalBudget || trip.totalBudget || 30000;
  const estimatedSpending = data.estimatedSpending || trip.budgetBreakdown?.totalEstimated || totalBudget;
  const remainingBudget = totalBudget - estimatedSpending;
  const utilization = data.utilizationPercentage || Math.round((estimatedSpending / totalBudget) * 100);
  const costPerPerson = data.costPerPerson || Math.round(estimatedSpending / Math.max(1, trip.travelersCount || 1));

  // Prepare chart data
  const chartData = [
    { name: 'Transport', category: 'Transportation', amount: trip.budgetBreakdown?.transportation || Math.round(totalBudget * 0.25) },
    { name: 'Stay', category: 'Accommodation', amount: trip.budgetBreakdown?.accommodation || Math.round(totalBudget * 0.35) },
    { name: 'Food', category: 'Food', amount: trip.budgetBreakdown?.food || Math.round(totalBudget * 0.20) },
    { name: 'Activities', category: 'Activities', amount: trip.budgetBreakdown?.activities || Math.round(totalBudget * 0.12) },
    { name: 'Shopping', category: 'Shopping', amount: trip.budgetBreakdown?.shopping || Math.round(totalBudget * 0.04) },
    { name: 'Transit', category: 'Local Transport', amount: trip.budgetBreakdown?.localTransport || Math.round(totalBudget * 0.04) },
    { name: 'Emergency', category: 'Emergency', amount: trip.budgetBreakdown?.emergency || Math.round(totalBudget * 0.02) },
    { name: 'Misc', category: 'Miscellaneous', amount: trip.budgetBreakdown?.miscellaneous || 0 }
  ].filter(c => c.amount > 0);

  return (
    <div className="space-y-6">
      {/* Top Banner & KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Wallet size={15} className="text-amber-400" />
            <span>Total Budget</span>
          </div>
          <div className="text-xl font-bold text-white">₹{totalBudget.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-slate-400 mt-1">₹{costPerPerson.toLocaleString('en-IN')}/person</div>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <TrendingUp size={15} className="text-indigo-400" />
            <span>Estimated Spend</span>
          </div>
          <div className="text-xl font-bold text-white">₹{estimatedSpending.toLocaleString('en-IN')}</div>
          <div className="text-[11px] text-indigo-400 mt-1">{utilization}% allocated</div>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <TrendingDown size={15} className={remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'} />
            <span>Remaining Buffer</span>
          </div>
          <div className={`text-xl font-bold ${remainingBudget >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            ₹{remainingBudget.toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">{remainingBudget >= 0 ? 'Safe margin' : 'Budget deficit'}</div>
        </Card>

        <Card className="p-4 border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-2 text-slate-400 text-xs font-medium mb-1">
            <Sparkles size={15} className="text-amber-400" />
            <span>Projected Savings</span>
          </div>
          <div className="text-xl font-bold text-amber-400">
            ₹{(data.projectedSavings || 0).toLocaleString('en-IN')}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">Via AI alternatives</div>
        </Card>
      </div>

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

      {/* Target Budget Adjuster */}
      <Card className="p-4 border-slate-800 bg-gradient-to-r from-slate-900 to-indigo-950/30">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Sparkles size={16} className="text-amber-400" />
              Smart Budget Goal & Financial Optimization
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Adjust maximum spending limit and run AI optimization to detect savings across 8 categories.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-white">
              <span className="text-slate-400 mr-1.5 font-bold">₹</span>
              <input
                type="number"
                value={targetBudgetInput}
                onChange={(e) => setTargetBudgetInput(e.target.value)}
                className="w-24 bg-transparent text-white font-bold focus:outline-none"
                placeholder="Target"
              />
            </div>

            <button
              onClick={() => handleRunOptimization(false)}
              disabled={isOptimizing}
              className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow transition disabled:opacity-50"
            >
              {isOptimizing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
              Analyze & Optimize
            </button>

            {data.projectedSavings > 0 && (
              <button
                onClick={() => handleRunOptimization(true)}
                disabled={applyingSavings}
                className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition disabled:opacity-50"
              >
                {applyingSavings ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                Apply Savings (-₹{data.projectedSavings.toLocaleString('en-IN')})
              </button>
            )}
          </div>
        </div>
      </Card>

      {/* Overspending Alerts */}
      {data.overspendingAlerts && data.overspendingAlerts.length > 0 && (
        <div className="space-y-2">
          {data.overspendingAlerts.map((alert, idx) => (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-rose-950/20 border border-rose-500/30 flex items-start gap-3 text-xs"
            >
              <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-rose-300">{alert.category} Warning</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400">
                    +₹{alert.amount?.toLocaleString('en-IN')} over
                  </span>
                </div>
                <p className="text-slate-300 mt-1 leading-relaxed">{alert.reason}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Visual Chart & Category Allocations */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart View */}
        <Card className="p-5 border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-white">Expense Distribution</h4>
              <p className="text-xs text-slate-400">Category-wise financial breakdown</p>
            </div>
            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-0.5">
              <button
                onClick={() => setChartView('bar')}
                className={`p-1.5 rounded text-xs transition ${chartView === 'bar' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Bar Chart"
              >
                <BarChart3 size={15} />
              </button>
              <button
                onClick={() => setChartView('pie')}
                className={`p-1.5 rounded text-xs transition ${chartView === 'pie' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'}`}
                title="Pie Chart"
              >
                <PieIcon size={15} />
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              {chartView === 'bar' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} angle={-25} textAnchor="end" />
                  <YAxis stroke="#64748b" fontSize={11} tickFormatter={(val) => `₹${val / 1000}k`} />
                  <RechartsTooltip
                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Allocated']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                  <Bar dataKey="amount" radius={[6, 6, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#6366f1'} />
                    ))}
                  </Bar>
                </BarChart>
              ) : (
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="amount"
                    nameKey="category"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={85}
                    paddingAngle={3}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={CATEGORY_COLORS[entry.category] || '#6366f1'} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(value) => [`₹${value.toLocaleString('en-IN')}`, 'Amount']}
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', fontSize: '12px' }}
                  />
                </PieChart>
              )}
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Category List */}
        <Card className="p-5 border-slate-800 space-y-3">
          <h4 className="text-sm font-bold text-white">Category Allocation Breakdown</h4>
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {chartData.map((cat, i) => {
              const pct = Math.round((cat.amount / Math.max(1, totalBudget)) * 100);
              return (
                <div key={i} className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2.5">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: CATEGORY_COLORS[cat.category] || '#6366f1' }}
                    />
                    <span className="font-semibold text-slate-200">{cat.category}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-[11px]">{pct}%</span>
                    <span className="font-bold text-white">₹{cat.amount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* AI Recommendations & Alternatives */}
      {data.optimizationSuggestions && data.optimizationSuggestions.length > 0 && (
        <Card className="p-5 border-amber-500/20 bg-gradient-to-br from-slate-900 to-amber-950/10 space-y-3">
          <div className="flex items-center gap-2 text-amber-400">
            <Sparkles size={18} />
            <h4 className="text-sm font-bold text-white">AI Cost-Saving Alternatives</h4>
          </div>
          <p className="text-xs text-slate-400">
            Personalized alternatives designed to eliminate overspending without sacrificing your travel style.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            {data.optimizationSuggestions.map((sugg, i) => (
              <div key={i} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-amber-500/40 transition text-xs space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-bold text-slate-100">{sugg.title}</span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">
                    Save ₹{sugg.potentialSavings?.toLocaleString('en-IN')}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed">{sugg.description}</p>
                {sugg.impact && (
                  <div className="pt-1 text-[11px] text-amber-400/90 font-medium">
                    ⚡ Impact: {sugg.impact}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

