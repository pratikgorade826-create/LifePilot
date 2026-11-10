import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Plane,
  Calendar,
  Users,
  Wallet,
  ArrowLeft,
  Printer,
  CheckCircle2,
  Trash2,
  Sparkles,
  MapPin,
  Clock,
  CheckSquare,
  Square,
  Edit3,
  Loader2,
  AlertCircle,
  X,
  Utensils,
  Hotel,
  ShieldCheck,
  AlertTriangle,
  Zap,
  TrendingUp,
  RefreshCw,
  Info,
  Navigation,
  CreditCard,
  Plus,
  Receipt,
  TrendingDown,
  Filter,
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
import { tripsAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { TripRouteMap } from '../components/map/TripRouteMap';

export const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'budget' | 'feasibility' | 'packing' | 'prep'
  const [reportModal, setReportModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState('');

  // Context-Aware AI Trip Assistant states
  const [assistantCommand, setAssistantCommand] = useState('');
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantPreview, setAssistantPreview] = useState(null);
  const [assistantApplying, setAssistantApplying] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [assistantSuccessMessage, setAssistantSuccessMessage] = useState('');

  // Feasibility Checker states
  const [feasibilityReport, setFeasibilityReport] = useState(null);
  const [checkingFeasibility, setCheckingFeasibility] = useState(false);
  const [applyingFix, setApplyingFix] = useState(false);
  const [fixSuccessMessage, setFixSuccessMessage] = useState('');

  // Phase 5.1: Real-Time Expense Tracker states
  const [expenses, setExpenses] = useState([]);
  const [expenseAnalytics, setExpenseAnalytics] = useState(null);
  const [loadingExpenses, setLoadingExpenses] = useState(false);
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [newExpense, setNewExpense] = useState({
    category: 'Food',
    amount: '',
    description: '',
    expenseDate: new Date().toISOString().split('T')[0]
  });
  const [isSavingExpense, setIsSavingExpense] = useState(false);
  const [expenseError, setExpenseError] = useState('');
  const [expenseSuccessMessage, setExpenseSuccessMessage] = useState('');
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [deletingExpenseId, setDeletingExpenseId] = useState(null);

  // Edit form state
  const [editForm, setEditForm] = useState({
    name: '',
    startingLocation: '',
    destination: '',
    departureDate: '',
    returnDate: '',
    durationDays: 5,
    travelersCount: 1,
    totalBudget: 30000,
    travelStyle: 'Standard',
    status: 'planned',
    overview: ''
  });

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const res = await tripsAPI.getOne(id);
      const loaded = res.data.trip;
      setTrip(loaded);

      if (loaded.feasibilityReport) {
        setFeasibilityReport(loaded.feasibilityReport);
      } else {
        // Automatically calculate feasibility if not already saved
        runFeasibilityCheckSilently(id);
      }

      // Populate edit form
      if (loaded) {
        const depStr = loaded.departureDate ? new Date(loaded.departureDate).toISOString().split('T')[0] : '';
        const retStr = loaded.returnDate ? new Date(loaded.returnDate).toISOString().split('T')[0] : '';
        setEditForm({
          name: loaded.name || '',
          startingLocation: loaded.startingLocation || '',
          destination: loaded.destination || '',
          departureDate: depStr,
          returnDate: retStr,
          durationDays: loaded.durationDays || loaded.itinerary?.length || 5,
          travelersCount: loaded.travelersCount || 1,
          totalBudget: loaded.totalBudget || 30000,
          travelStyle: loaded.travelStyle || 'Standard',
          status: loaded.status || 'planned',
          overview: loaded.overview || ''
        });
        loadExpenses(id);
      }
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadExpenses = async (tripId) => {
    try {
      setLoadingExpenses(true);
      const res = await tripsAPI.getExpenses(tripId);
      setExpenses(res.data.expenses || []);
      setExpenseAnalytics(res.data.analytics || null);
    } catch (err) {
      console.error('Failed to load trip expenses:', err);
    } finally {
      setLoadingExpenses(false);
    }
  };

  const handleOpenAddExpense = (expenseToEdit = null) => {
    if (expenseToEdit) {
      setEditingExpense(expenseToEdit);
      const dateStr = expenseToEdit.expenseDate
        ? new Date(expenseToEdit.expenseDate).toISOString().split('T')[0]
        : new Date().toISOString().split('T')[0];
      setNewExpense({
        category: expenseToEdit.category || 'Food',
        amount: expenseToEdit.amount || '',
        description: expenseToEdit.description || '',
        expenseDate: dateStr
      });
    } else {
      setEditingExpense(null);
      setNewExpense({
        category: 'Food',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0]
      });
    }
    setExpenseError('');
    setShowAddExpenseModal(true);
  };

  const handleSaveExpense = async (e) => {
    e.preventDefault();
    const amt = parseFloat(newExpense.amount);
    if (isNaN(amt) || amt < 0) {
      setExpenseError('Please enter a valid expense amount.');
      return;
    }

    setIsSavingExpense(true);
    setExpenseError('');
    try {
      const payload = {
        category: newExpense.category,
        amount: amt,
        description: newExpense.description,
        expenseDate: newExpense.expenseDate
      };

      if (editingExpense) {
        const res = await tripsAPI.updateExpense(id, editingExpense._id, payload);
        setExpenseAnalytics(res.data.analytics);
        setExpenses(prev =>
          prev.map(exp => (exp._id === editingExpense._id ? res.data.expense : exp))
        );
        setExpenseSuccessMessage('Expense updated successfully!');
      } else {
        const res = await tripsAPI.addExpense(id, payload);
        setExpenseAnalytics(res.data.analytics);
        setExpenses(prev => [res.data.expense, ...prev]);
        setExpenseSuccessMessage('Expense added successfully!');
      }

      setShowAddExpenseModal(false);
      setEditingExpense(null);
      setNewExpense({
        category: 'Food',
        amount: '',
        description: '',
        expenseDate: new Date().toISOString().split('T')[0]
      });
      setTimeout(() => setExpenseSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to save expense:', err);
      setExpenseError(err.response?.data?.message || 'Failed to save expense. Please try again.');
    } finally {
      setIsSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!expenseId) return;
    setDeletingExpenseId(expenseId);
    try {
      const res = await tripsAPI.deleteExpense(id, expenseId);
      setExpenses(prev => prev.filter(exp => exp._id !== expenseId));
      setExpenseAnalytics(res.data.analytics);
      setExpenseSuccessMessage('Expense deleted successfully.');
      setTimeout(() => setExpenseSuccessMessage(''), 4000);
    } catch (err) {
      console.error('Failed to delete expense:', err);
      setExpenseError(err.response?.data?.message || 'Failed to delete expense.');
    } finally {
      setDeletingExpenseId(null);
    }
  };

  const runFeasibilityCheckSilently = async (tripId) => {
    try {
      const res = await tripsAPI.checkFeasibility(tripId);
      if (res.data?.feasibilityReport) {
        setFeasibilityReport(res.data.feasibilityReport);
        setTrip(res.data.trip);
      }
    } catch (e) {
      // ignore silent background check errors
    }
  };

  const handleRunFeasibility = async () => {
    try {
      setCheckingFeasibility(true);
      setFixSuccessMessage('');
      const res = await tripsAPI.checkFeasibility(id);
      setFeasibilityReport(res.data.feasibilityReport);
      setTrip(res.data.trip);
    } catch (err) {
      console.error('Feasibility check failed:', err);
    } finally {
      setCheckingFeasibility(false);
    }
  };

  const handleApplyFix = async (issueId = 'ALL') => {
    try {
      setApplyingFix(true);
      setFixSuccessMessage('');
      const res = await tripsAPI.applyFeasibilityFix(id, { issueId });
      setTrip(res.data.trip);
      setFeasibilityReport(res.data.feasibilityReport);
      setFixSuccessMessage(res.data.message || 'Itinerary schedule and buffers optimized successfully.');
      setTimeout(() => setFixSuccessMessage(''), 6000);
    } catch (err) {
      console.error('Failed to apply feasibility fix:', err);
    } finally {
      setApplyingFix(false);
    }
  };

  const handleTogglePackingItem = async (index) => {
    if (!trip || !trip.packingChecklist) return;
    const updated = trip.packingChecklist.map((item, idx) =>
      idx === index ? { ...item, checked: !item.checked } : item
    );

    try {
      setTrip({ ...trip, packingChecklist: updated });
      await tripsAPI.update(id, { packingChecklist: updated });
    } catch (err) {
      console.error('Failed to update packing item:', err);
    }
  };

  const handleTogglePrepItem = async (index) => {
    if (!trip || !trip.preparationChecklist) return;
    const updated = trip.preparationChecklist.map((item, idx) =>
      idx === index ? { ...item, checked: !item.checked } : item
    );

    try {
      setTrip({ ...trip, preparationChecklist: updated });
      await tripsAPI.update(id, { preparationChecklist: updated });
    } catch (err) {
      console.error('Failed to update prep item:', err);
    }
  };

  const handleAssistantSubmit = async (e, directText) => {
    if (e && e.preventDefault) e.preventDefault();
    const cmd = (directText !== undefined ? directText : assistantCommand) || '';
    if (!cmd.trim() || !trip) return;

    setAssistantLoading(true);
    setAssistantError('');
    setAssistantSuccessMessage('');
    try {
      const res = await tripsAPI.assistantCommand(id, cmd.trim());
      if (res.data && res.data.preview) {
        setAssistantPreview(res.data.preview);
      }
    } catch (err) {
      console.error('Failed to process assistant command:', err);
      setAssistantError(err.response?.data?.message || 'Failed to interpret command. Please try again.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleApproveAssistantChanges = async () => {
    if (!assistantPreview || !assistantPreview.proposedChanges || !trip) return;

    setAssistantApplying(true);
    setAssistantError('');
    try {
      const res = await tripsAPI.assistantApply(id, assistantPreview.proposedChanges);
      if (res.data && res.data.trip) {
        setTrip(res.data.trip);
        setAssistantSuccessMessage('Changes approved and applied to your trip successfully!');
        setAssistantPreview(null);
        setAssistantCommand('');
        runFeasibilityCheckSilently(id);
        setTimeout(() => setAssistantSuccessMessage(''), 6000);
      }
    } catch (err) {
      console.error('Failed to apply assistant changes:', err);
      setAssistantError(err.response?.data?.message || 'Failed to apply changes to trip.');
    } finally {
      setAssistantApplying(false);
    }
  };

  const handleDiscardAssistantPreview = () => {
    setAssistantPreview(null);
    setAssistantError('');
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError('');

    if (!editForm.name.trim()) {
      setEditError('Trip name is required.');
      return;
    }
    if (!editForm.destination.trim()) {
      setEditError('Destination is required.');
      return;
    }

    setIsSavingEdit(true);

    try {
      const payload = {
        name: editForm.name.trim(),
        startingLocation: editForm.startingLocation.trim(),
        destination: editForm.destination.trim(),
        departureDate: new Date(editForm.departureDate),
        returnDate: new Date(editForm.returnDate),
        durationDays: editForm.durationDays,
        travelersCount: editForm.travelersCount,
        totalBudget: editForm.totalBudget,
        travelStyle: editForm.travelStyle,
        status: editForm.status,
        overview: editForm.overview
      };

      const res = await tripsAPI.update(id, payload);
      setTrip(res.data.trip);
      setShowEditModal(false);
      runFeasibilityCheckSilently(id);
    } catch (err) {
      console.error('Failed to update trip:', err);
      setEditError(err.response?.data?.message || 'Failed to update trip. Please verify details.');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteTrip = async () => {
    try {
      setIsDeleting(true);
      await tripsAPI.delete(id);
      navigate('/trips');
    } catch (err) {
      console.error('Delete trip failed:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status = 'planned') => {
    switch (status.toLowerCase()) {
      case 'ongoing':
        return <Badge variant="cyan">Ongoing</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      case 'draft':
        return <Badge variant="neutral">Draft</Badge>;
      default:
        return <Badge variant="primary">Planned</Badge>;
    }
  };

  const getAssistantActionBadge = (actionType) => {
    switch (actionType) {
      case 'ADD_ACTIVITY':
        return <Badge variant="success">Add Activity</Badge>;
      case 'REMOVE_ACTIVITY':
        return <Badge variant="danger">Remove Activity</Badge>;
      case 'REPLACE_ACTIVITY':
        return <Badge variant="warning">Replace Attraction</Badge>;
      case 'MODIFY_TIMING':
        return <Badge variant="primary">Modify Timing</Badge>;
      case 'CHANGE_DATES':
        return <Badge variant="purple">Change Travel Dates</Badge>;
      case 'ADJUST_BUDGET':
        return <Badge variant="cyan">Adjust Budget</Badge>;
      case 'CHANGE_PREFERENCES':
        return <Badge variant="indigo">Change Preferences</Badge>;
      default:
        return <Badge variant="neutral">{actionType}</Badge>;
    }
  };

  const renderAssistantWidget = () => (
    <Card className="bg-[#101524] border-indigo-500/30 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
        <div>
          <h4 className="text-sm font-bold text-white flex items-center gap-2">
            <Sparkles size={16} className="text-indigo-400" />
            Context-Aware AI Trip Assistant
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Ask to add, remove, swap activities, adjust timings, shift travel dates, modify budget, or change preferences. Unaffected days remain completely intact.
          </p>
        </div>
        <Badge variant="cyan">Context: {trip.name}</Badge>
      </div>

      {/* Quick Suggestion Chips */}
      <div className="space-y-1.5">
        <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
          Quick Natural Language Commands:
        </span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '+ Add evening cruise Day 1', cmd: 'Add evening sunset cruise on Day 1' },
            { label: '+ Add Scuba Diving Day 2', cmd: 'Add Scuba Diving at Grande Island on Day 2 morning with cost ₹3500' },
            { label: '🗑️ Remove activity on Day 1', cmd: `Remove ${trip.itinerary?.[0]?.activities?.[trip.itinerary[0].activities.length - 1]?.title || 'last activity'} from Day 1` },
            { label: '🔄 Replace attraction', cmd: `Replace ${trip.itinerary?.[0]?.activities?.[0]?.title || 'first activity'} with Scenic Heritage Walk on Day 1` },
            { label: '⏰ Shift Day 1 time to 11:30 AM', cmd: 'Change Day 1 morning activity timing to 11:30 AM' },
            { label: '📅 Shift dates by 7 days', cmd: 'Shift travel dates by 7 days' },
            { label: `💰 Set budget to ₹${((trip.totalBudget || 30000) + 15000).toLocaleString('en-IN')}`, cmd: `Increase total budget to ${(trip.totalBudget || 30000) + 15000}` },
            { label: '✨ Luxury & Vegetarian', cmd: 'Change travel style to Luxury and preference to vegetarian food only' }
          ].map((chip, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setAssistantCommand(chip.cmd);
                handleAssistantSubmit(null, chip.cmd);
              }}
              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-indigo-600/30 hover:text-indigo-300 text-slate-300 border border-slate-700/60 transition"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* Assistant Command Bar */}
      <form onSubmit={handleAssistantSubmit} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={assistantCommand}
          onChange={(e) => setAssistantCommand(e.target.value)}
          placeholder="e.g. 'Add parasailing on Day 2 morning', 'Change budget to 45000', 'Swap Amer Fort with Albert Hall'..."
          disabled={assistantLoading || assistantApplying}
          className="flex-1 px-3.5 py-2.5 bg-[#080B13] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={assistantLoading || !assistantCommand.trim() || assistantApplying}
          className="px-4 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50 flex items-center justify-center gap-1.5 whitespace-nowrap shadow-md shadow-indigo-950/40"
        >
          {assistantLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {assistantLoading ? 'Analyzing Context...' : 'Propose Changes'}
        </button>
      </form>

      {/* Assistant Error Alert */}
      {assistantError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} className="text-rose-400 shrink-0" />
            <span>{assistantError}</span>
          </div>
          <button onClick={() => setAssistantError('')} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* PROPOSED CHANGES PREVIEW (USER APPROVAL GATE) */}
      {assistantPreview && (
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-br from-indigo-950/40 via-[#0B0F19] to-slate-900/60 border-2 border-indigo-500/50 shadow-xl space-y-4 animate-in fade-in duration-200">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-indigo-500/20">
            <div className="flex items-center gap-2">
              <Sparkles size={18} className="text-indigo-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-white">Preview of Proposed Modification</h4>
                <p className="text-[11px] text-slate-400">Review changes below. MongoDB will NOT update until you click Approve.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {getAssistantActionBadge(assistantPreview.actionType)}
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                Approval Required
              </span>
            </div>
          </div>

          {/* Summary & Impact Banner */}
          <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200 space-y-1">
            <p className="font-semibold text-white">{assistantPreview.summary}</p>
            <p className="text-slate-300 text-[11px]">{assistantPreview.impactSummary}</p>
          </div>

          {/* Visual Diff View */}
          <div className="space-y-2">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
              <span>Proposed Changes Diff</span>
              <span className="text-slate-500 text-[10px]">Unaffected sections preserved intact</span>
            </div>

            {/* Case 1: Itinerary Addition */}
            {assistantPreview.diff?.type === 'ITINERARY_ADDITION' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">Previous Day {assistantPreview.affectedDay} Schedule</span>
                  <div className="space-y-1.5">
                    {assistantPreview.diff.before?.map((act, i) => (
                      <div key={i} className="text-slate-400 text-[11px] flex items-center justify-between">
                        <span>{act.time} — {act.title}</span>
                        <span className="text-slate-500">₹{act.estimatedCost || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-2">Updated Day {assistantPreview.affectedDay} Schedule</span>
                  <div className="space-y-1.5">
                    {assistantPreview.diff.after?.map((act, i) => {
                      const isNew = act.title === assistantPreview.diff.addedItem?.title;
                      return (
                        <div key={i} className={`text-[11px] flex items-center justify-between p-1 rounded ${isNew ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/40' : 'text-slate-300'}`}>
                          <span>{act.time} — {act.title} {isNew && <span className="ml-1 text-[10px] bg-emerald-500/30 px-1.5 py-0.5 rounded text-emerald-300 font-bold">+ Added</span>}</span>
                          <span className="text-slate-400">₹{act.estimatedCost || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Case 2: Itinerary Removal */}
            {assistantPreview.diff?.type === 'ITINERARY_REMOVAL' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-2">Previous Day {assistantPreview.affectedDay} Schedule</span>
                  <div className="space-y-1.5">
                    {assistantPreview.diff.before?.map((act, i) => {
                      const isRemoved = act.title === assistantPreview.diff.removedItem?.title;
                      return (
                        <div key={i} className={`text-[11px] flex items-center justify-between ${isRemoved ? 'line-through text-rose-400 font-semibold' : 'text-slate-400'}`}>
                          <span>{act.time} — {act.title} {isRemoved && <span className="no-underline ml-1 text-[10px] bg-rose-500/20 text-rose-300 px-1.5 py-0.5 rounded font-bold">Removed</span>}</span>
                          <span className="text-slate-500">₹{act.estimatedCost || 0}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800">
                  <span className="text-[11px] font-bold text-indigo-400 block mb-2">Updated Day {assistantPreview.affectedDay} Schedule</span>
                  <div className="space-y-1.5">
                    {assistantPreview.diff.after?.map((act, i) => (
                      <div key={i} className="text-slate-200 text-[11px] flex items-center justify-between">
                        <span>{act.time} — {act.title}</span>
                        <span className="text-slate-400">₹{act.estimatedCost || 0}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Case 3: Itinerary Replacement */}
            {assistantPreview.diff?.type === 'ITINERARY_REPLACEMENT' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30">
                  <span className="text-[11px] font-bold text-rose-400 block mb-1">Replaced Activity</span>
                  <p className="text-white font-semibold text-xs">{assistantPreview.diff.replacedItem?.title}</p>
                  <p className="text-[11px] text-slate-400">{assistantPreview.diff.replacedItem?.time} • Location: {assistantPreview.diff.replacedItem?.location || 'Local'}</p>
                  <p className="text-[11px] text-slate-500 mt-1">Cost: ₹{assistantPreview.diff.replacedItem?.estimatedCost || 0}</p>
                </div>
                <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-500/40">
                  <span className="text-[11px] font-bold text-emerald-400 block mb-1">New Alternative Attraction</span>
                  <p className="text-white font-semibold text-xs">{assistantPreview.diff.newItem?.title}</p>
                  <p className="text-[11px] text-slate-400">{assistantPreview.diff.newItem?.time} • Location: {assistantPreview.diff.newItem?.location || 'Local'}</p>
                  <p className="text-[11px] text-emerald-300 mt-1">Estimated Cost: ₹{assistantPreview.diff.newItem?.estimatedCost || 0}</p>
                </div>
              </div>
            )}

            {/* Case 4: Timing Modification */}
            {assistantPreview.diff?.type === 'TIMING_MODIFICATION' && (
              <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800 text-xs flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-slate-400 block">Activity</span>
                  <span className="font-semibold text-white">{assistantPreview.diff.modifiedActivity?.title}</span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block">Timing Adjustment</span>
                  <span className="line-through text-slate-500 mr-2">{assistantPreview.diff.oldTiming}</span>
                  <span className="font-bold text-indigo-400 text-sm">→ {assistantPreview.diff.newTiming}</span>
                </div>
              </div>
            )}

            {/* Case 5: Dates Change */}
            {assistantPreview.diff?.type === 'DATES_CHANGE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block mb-1">Current Travel Dates</span>
                  <p className="text-white font-semibold">{assistantPreview.diff.before?.departureDate} → {assistantPreview.diff.before?.returnDate}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{assistantPreview.diff.before?.durationDays} Days</p>
                </div>
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/40">
                  <span className="text-[11px] font-bold text-purple-400 block mb-1">Proposed New Dates</span>
                  <p className="text-white font-semibold">{assistantPreview.diff.after?.departureDate} → {assistantPreview.diff.after?.returnDate}</p>
                  <p className="text-[11px] text-purple-300 mt-0.5">{assistantPreview.diff.after?.durationDays} Days (Day dates shifted automatically)</p>
                </div>
              </div>
            )}

            {/* Case 6: Budget Adjustment */}
            {assistantPreview.diff?.type === 'BUDGET_ADJUSTMENT' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800">
                  <span className="text-[11px] font-bold text-slate-400 block">Previous Total Budget</span>
                  <span className="text-base font-bold text-white">₹{assistantPreview.diff.before?.totalBudget?.toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-slate-400 block">₹{assistantPreview.diff.before?.budgetPerPerson?.toLocaleString('en-IN')} / person</span>
                </div>
                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/40">
                  <span className="text-[11px] font-bold text-cyan-400 block">Adjusted Total Budget</span>
                  <span className="text-base font-bold text-cyan-300">₹{assistantPreview.diff.after?.totalBudget?.toLocaleString('en-IN')}</span>
                  <span className="text-[11px] text-cyan-200 block">₹{assistantPreview.diff.after?.budgetPerPerson?.toLocaleString('en-IN')} / person</span>
                </div>
              </div>
            )}

            {/* Case 7: Preferences Change */}
            {assistantPreview.diff?.type === 'PREFERENCES_CHANGE' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#080B13] border border-slate-800 space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 block">Current Style & Interests</span>
                  <p className="text-white"><strong className="text-slate-400">Style:</strong> {assistantPreview.diff.before?.travelStyle}</p>
                  <p className="text-slate-300 text-[11px]"><strong className="text-slate-400">Interests:</strong> {assistantPreview.diff.before?.interests?.join(', ')}</p>
                </div>
                <div className="p-3 rounded-xl bg-indigo-950/20 border border-indigo-500/40 space-y-1">
                  <span className="text-[11px] font-bold text-indigo-400 block">Updated Style & Preferences</span>
                  <p className="text-white"><strong className="text-slate-400">Style:</strong> {assistantPreview.diff.after?.travelStyle}</p>
                  <p className="text-slate-200 text-[11px]"><strong className="text-slate-400">Interests:</strong> {assistantPreview.diff.after?.interests?.join(', ')}</p>
                  {assistantPreview.diff.after?.additionalPreferences && (
                    <p className="text-indigo-300 text-[11px]"><strong className="text-slate-400">Note:</strong> {assistantPreview.diff.after?.additionalPreferences}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Recalculated Financials Pill */}
          {assistantPreview.recalculatedBudget && (
            <div className="p-2.5 rounded-xl bg-[#080B13] border border-slate-800 text-[11px] text-slate-300 flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-400">
                <Wallet size={13} className="text-indigo-400" />
                <span>Recalculated Estimates:</span>
              </span>
              <span className="text-white">
                Total Budget: <strong>₹{assistantPreview.recalculatedBudget.totalBudget?.toLocaleString('en-IN')}</strong>
              </span>
              <span className="text-indigo-300">
                Per Person: <strong>₹{assistantPreview.recalculatedBudget.budgetPerPerson?.toLocaleString('en-IN')}</strong>
              </span>
              {assistantPreview.recalculatedBudget.budgetBreakdown?.activities !== undefined && (
                <span className="text-emerald-300">
                  Activities: <strong>₹{assistantPreview.recalculatedBudget.budgetBreakdown.activities.toLocaleString('en-IN')}</strong>
                </span>
              )}
            </div>
          )}

          {/* Decision Buttons (Approve vs Discard) */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={handleDiscardAssistantPreview}
              disabled={assistantApplying}
              className="w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-700 transition flex items-center justify-center gap-1.5"
            >
              <X size={14} /> Discard Preview
            </button>
            <button
              type="button"
              onClick={handleApproveAssistantChanges}
              disabled={assistantApplying}
              className="w-full sm:w-auto px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 disabled:opacity-50"
            >
              {assistantApplying ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
              {assistantApplying ? 'Saving to Database...' : 'Approve & Update Trip'}
            </button>
          </div>
        </div>
      )}
    </Card>
  );

  const getFeasibilityColor = (score) => {
    if (!score && score !== 0) return 'text-slate-400';
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getFeasibilityBadgeVariant = (score) => {
    if (!score && score !== 0) return 'neutral';
    if (score >= 85) return 'success';
    if (score >= 70) return 'warning';
    return 'danger';
  };

  if (loading) {
    return <LoadingSpinner label="Loading itinerary details..." />;
  }

  if (!trip) {
    return (
      <div className="p-12 text-center text-slate-400 bg-[#0E131F] rounded-2xl border border-slate-800">
        <p className="text-base font-semibold text-white mb-2">Trip Not Found</p>
        <p className="text-xs text-slate-400 mb-4">The trip you requested could not be located or may have been deleted.</p>
        <Link to="/trips" className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition inline-block">
          Return to Trips
        </Link>
      </div>
    );
  }

  const CATEGORY_COLORS = {
    Transportation: '#3b82f6',
    Accommodation: '#a855f7',
    Food: '#10b981',
    Activities: '#f59e0b',
    Miscellaneous: '#64748b'
  };

  const getExpenseCategoryBadge = (cat) => {
    switch (cat?.toLowerCase()) {
      case 'transportation':
        return <Badge variant="primary">Transportation</Badge>;
      case 'accommodation':
        return <Badge variant="purple">Accommodation</Badge>;
      case 'food':
        return <Badge variant="success">Food</Badge>;
      case 'activities':
        return <Badge variant="warning">Activities</Badge>;
      case 'miscellaneous':
        return <Badge variant="neutral">Miscellaneous</Badge>;
      default:
        return <Badge variant="neutral">{cat}</Badge>;
    }
  };

  const renderExpenseTracker = () => {
    const formatCurrency = (amount) => {
      const num = Number(amount) || 0;
      return num.toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
    };

    const budgetData = trip.budgetBreakdown || {};
    const totalBudget = trip.totalBudget || 0;
    const totalSpent = expenseAnalytics?.totalActualExpenses ?? expenses.reduce((s, e) => s + (Number(e.amount) || 0), 0);
    const remaining = totalBudget - totalSpent;
    const utilization = totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100 * 10) / 10 : 0;
    const status = totalSpent > totalBudget ? 'EXCEEDED' : (utilization >= 80 ? 'WARNING_80' : 'HEALTHY');

    // Filter expenses by category
    const filteredExpenses = expenseCategoryFilter === 'ALL'
      ? expenses
      : expenses.filter(e => (e.category || '').toLowerCase() === expenseCategoryFilter.toLowerCase());

    // Prepare chart data for Planned vs Actual
    const categoryComparisonData = [
      {
        name: 'Transport',
        fullName: 'Transportation',
        Planned: Number(budgetData.transportation) || 0,
        Actual: expenses.filter(e => e.category === 'Transportation').reduce((s, e) => s + Number(e.amount), 0)
      },
      {
        name: 'Stay',
        fullName: 'Accommodation',
        Planned: Number(budgetData.accommodation) || 0,
        Actual: expenses.filter(e => e.category === 'Accommodation').reduce((s, e) => s + Number(e.amount), 0)
      },
      {
        name: 'Food',
        fullName: 'Food',
        Planned: Number(budgetData.food) || 0,
        Actual: expenses.filter(e => e.category === 'Food').reduce((s, e) => s + Number(e.amount), 0)
      },
      {
        name: 'Activities',
        fullName: 'Activities',
        Planned: Number(budgetData.activities) || 0,
        Actual: expenses.filter(e => e.category === 'Activities').reduce((s, e) => s + Number(e.amount), 0)
      },
      {
        name: 'Misc',
        fullName: 'Miscellaneous',
        Planned: Number(budgetData.miscellaneous) || 0,
        Actual: expenses.filter(e => e.category === 'Miscellaneous').reduce((s, e) => s + Number(e.amount), 0)
      }
    ];

    // Pie chart distribution
    const pieData = categoryComparisonData
      .filter(c => c.Actual > 0)
      .map(c => ({
        name: c.fullName,
        value: c.Actual,
        color: CATEGORY_COLORS[c.fullName] || '#6366f1'
      }));

    return (
      <div className="space-y-6">
        {/* Top 4 Metrics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Original Budget</span>
              <Wallet size={14} className="text-slate-500" />
            </span>
            <div className="text-2xl font-bold text-white mt-1">₹{formatCurrency(totalBudget)}</div>
            <span className="text-[11px] text-slate-500 block mt-1">₹{formatCurrency(trip.budgetPerPerson)} / person</span>
          </Card>

          <Card>
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Total Actual Spent</span>
              <CreditCard size={14} className="text-indigo-400" />
            </span>
            <div className={`text-2xl font-bold mt-1 ${totalSpent > totalBudget ? 'text-rose-400' : 'text-indigo-300'}`}>
              ₹{formatCurrency(totalSpent)}
            </div>
            <span className="text-[11px] text-slate-400 block mt-1">{utilization}% of total budget</span>
          </Card>

          <Card>
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Remaining Balance</span>
              {remaining >= 0 ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-rose-400" />}
            </span>
            <div className={`text-2xl font-bold mt-1 ${remaining >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ₹{formatCurrency(remaining)}
            </div>
            <span className={`text-[11px] block mt-1 ${remaining >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
              {remaining >= 0 ? 'Available balance' : `Over budget by ₹${formatCurrency(Math.abs(remaining))}`}
            </span>
          </Card>

          <Card>
            <span className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Budget Status</span>
              <Receipt size={14} className="text-slate-500" />
            </span>
            <div className="mt-2">
              {status === 'EXCEEDED' ? (
                <Badge variant="danger">Budget Exceeded</Badge>
              ) : status === 'WARNING_80' ? (
                <Badge variant="warning">80%+ Utilized</Badge>
              ) : (
                <Badge variant="success">Healthy Pace</Badge>
              )}
            </div>
            <span className="text-[11px] text-slate-400 block mt-2">{expenses.length} logged expense{expenses.length === 1 ? '' : 's'}</span>
          </Card>
        </div>

        {/* Budget Alerts (Warning 80% / Exceeded / Overspent Categories) */}
        {status === 'EXCEEDED' && (
          <div className="p-4 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-200 text-xs flex items-start gap-3">
            <AlertTriangle size={18} className="text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-rose-300 text-sm">Budget Limit Exceeded!</strong>
              <span>
                Total actual expenses (₹{formatCurrency(totalSpent)}) have surpassed your original budget of ₹{formatCurrency(totalBudget)} by ₹{formatCurrency(Math.abs(remaining))}. Consider reviewing and curtailing discretionary expenses.
              </span>
            </div>
          </div>
        )}

        {status === 'WARNING_80' && (
          <div className="p-4 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200 text-xs flex items-start gap-3">
            <AlertCircle size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold text-amber-300 text-sm">Spending Warning: 80%+ Utilized</strong>
              <span>
                You have spent {utilization}% of your total budget. Only ₹{formatCurrency(remaining)} remains for the rest of your trip.
              </span>
            </div>
          </div>
        )}

        {/* Category-Level Overspending Alerts */}
        {categoryComparisonData.some(c => c.Actual > c.Planned && c.Planned > 0) && (
          <div className="p-3.5 rounded-xl bg-[#0B0F19] border border-amber-500/30 text-xs text-slate-300 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-amber-400 flex items-center gap-1.5">
              <AlertCircle size={14} /> Category Alerts:
            </span>
            {categoryComparisonData.filter(c => c.Actual > c.Planned && c.Planned > 0).map((c, i) => (
              <span key={i} className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px]">
                {c.fullName}: +₹{formatCurrency(c.Actual - c.Planned)} over
              </span>
            ))}
          </div>
        )}

        {/* Visual Charts: Planned vs Actual and Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* BarChart: Planned vs Actual */}
          <Card className="lg:col-span-2 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <BarChart size={15} className="text-indigo-400" />
                  Planned Budget vs Actual Spending
                </h4>
                <p className="text-[11px] text-slate-400">Comparison across travel categories in INR (₹)</p>
              </div>
            </div>

            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryComparisonData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                  <RechartsTooltip
                    contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                    formatter={(val) => [`₹${formatCurrency(val)}`, '']}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Planned" fill="#6366f1" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="Actual" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* PieChart: Actual Spending Distribution */}
          <Card className="space-y-3">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt size={15} className="text-purple-400" />
                Actual Expense Distribution
              </h4>
              <p className="text-[11px] text-slate-400">Share of total spent (₹{formatCurrency(totalSpent)})</p>
            </div>

            {pieData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={75}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: '#0B0F19', borderColor: '#334155', borderRadius: '12px', fontSize: '11px', color: '#fff' }}
                      formatter={(val) => [`₹${formatCurrency(val)}`, '']}
                    />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center p-4 text-slate-500 text-xs">
                <CreditCard size={28} className="mb-2 opacity-40 text-slate-400" />
                <span>No expenses recorded yet. Log an expense to visualize distribution.</span>
              </div>
            )}
          </Card>
        </div>

        {/* Category Budget Performance Breakdown */}
        <Card className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-white">Category Budget Performance</h4>
            <span className="text-[11px] text-slate-400">Actual vs Planned Allocation</span>
          </div>

          <div className="space-y-3">
            {categoryComparisonData.map((cat, idx) => {
              const pct = cat.Planned > 0 ? Math.round((cat.Actual / cat.Planned) * 100) : (cat.Actual > 0 ? 100 : 0);
              const isOver = cat.Actual > cat.Planned && cat.Planned > 0;
              return (
                <div key={idx} className="p-3 rounded-xl bg-[#080B13] border border-slate-800 space-y-2">
                  <div className="flex flex-wrap items-center justify-between text-xs gap-1">
                    <span className="font-semibold text-white flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat.fullName] }} />
                      {cat.fullName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-slate-400 text-[11px]">
                        Spent: <strong className={isOver ? 'text-rose-400' : 'text-slate-200'}>₹{formatCurrency(cat.Actual)}</strong> / ₹{formatCurrency(cat.Planned)}
                      </span>
                      {isOver ? (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                          +₹{formatCurrency(cat.Actual - cat.Planned)} Over
                        </span>
                      ) : (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                          ₹{formatCurrency(cat.Planned - cat.Actual)} Left
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isOver ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Expense History & Management Table */}
        <Card className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
            <div>
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Receipt size={16} className="text-indigo-400" />
                Expense History
              </h4>
              <p className="text-[11px] text-slate-400">All recorded transactions and receipts for this trip</p>
            </div>
            <button
              onClick={() => handleOpenAddExpense()}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition shadow-md shadow-indigo-950/40"
            >
              <Plus size={14} /> Log New Expense
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            <span className="text-[11px] font-semibold text-slate-500 mr-1 flex items-center gap-1">
              <Filter size={12} /> Filter:
            </span>
            {['ALL', 'Transportation', 'Accommodation', 'Food', 'Activities', 'Miscellaneous'].map((filterCat) => (
              <button
                key={filterCat}
                onClick={() => setExpenseCategoryFilter(filterCat)}
                className={`text-[11px] px-2.5 py-1 rounded-lg transition font-medium whitespace-nowrap ${
                  expenseCategoryFilter === filterCat
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {filterCat} {filterCat !== 'ALL' && `(${expenses.filter(e => e.category === filterCat).length})`}
              </button>
            ))}
          </div>

          {/* Expenses List */}
          {filteredExpenses.length > 0 ? (
            <div className="space-y-2">
              {filteredExpenses.map((exp) => (
                <div
                  key={exp._id}
                  className="p-3.5 rounded-xl bg-[#080B13] hover:bg-slate-800/40 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-slate-800/80 text-slate-300 mt-0.5">
                      <Receipt size={16} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getExpenseCategoryBadge(exp.category)}
                        <span className="text-[11px] text-slate-400">
                          {exp.expenseDate
                            ? new Date(exp.expenseDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
                            : 'Date TBD'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-white">
                        {exp.description || 'No description provided'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-800">
                    <span className="text-sm font-bold text-white">
                      ₹{formatCurrency(exp.amount)}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenAddExpense(exp)}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                        title="Edit expense"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteExpense(exp._id)}
                        disabled={deletingExpenseId === exp._id}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition"
                        title="Delete expense"
                      >
                        {deletingExpenseId === exp._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 rounded-xl bg-[#080B13] border border-slate-800/60">
              <Receipt size={32} className="mx-auto mb-2 opacity-40 text-slate-400" />
              <p className="text-xs font-semibold text-slate-300 mb-1">No expenses found for this filter</p>
              <p className="text-[11px] text-slate-500 mb-3">Track payments for hotels, food, cabs, and activities as you travel.</p>
              <button
                onClick={() => handleOpenAddExpense()}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition inline-flex items-center gap-1.5"
              >
                <Plus size={13} /> Add Your First Expense
              </button>
            </div>
          )}
        </Card>
      </div>
    );
  };

  const budget = trip.budgetBreakdown || {};
  const departureFormatted = trip.departureDate
    ? new Date(trip.departureDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';
  const returnFormatted = trip.returnDate
    ? new Date(trip.returnDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'TBD';

  const packedCount = trip.packingChecklist?.filter((p) => p.checked).length || 0;
  const totalPackingCount = trip.packingChecklist?.length || 0;
  const prepCompletedCount = trip.preparationChecklist?.filter((p) => p.checked).length || 0;
  const totalPrepCount = trip.preparationChecklist?.length || 0;
  const currentFeasibilityScore = feasibilityReport?.overallScore ?? trip.feasibilityScore;

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-start gap-3">
          <button
            onClick={() => navigate('/trips')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition mt-1"
            title="Back to trips"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <h1 className="text-xl font-bold text-white">{trip.name}</h1>
              <Badge variant="primary">{trip.travelStyle} Style</Badge>
              {getStatusBadge(trip.status)}
              {currentFeasibilityScore !== null && currentFeasibilityScore !== undefined && (
                <button
                  onClick={() => setActiveTab('feasibility')}
                  className="hover:scale-105 transition-transform"
                  title="View Feasibility Analysis"
                >
                  <Badge variant={getFeasibilityBadgeVariant(currentFeasibilityScore)}>
                    <ShieldCheck size={12} className="mr-1 inline" />
                    {currentFeasibilityScore}/100 Feasible
                  </Badge>
                </button>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <MapPin size={13} className="text-slate-500" />
                <span>{trip.startingLocation || 'Origin'} → <strong className="text-slate-200">{trip.destination}</strong></span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Calendar size={13} className="text-slate-500" />
                <span>{departureFormatted} to {returnFormatted}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <Users size={13} className="text-slate-500" />
                <span>{trip.travelersCount} Traveler{trip.travelersCount > 1 ? 's' : ''}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5 text-indigo-400 font-medium">
                <Wallet size={13} />
                <span>₹{trip.budgetPerPerson?.toLocaleString('en-IN')}/person</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              activeTab === 'map'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
            }`}
          >
            <Navigation size={14} /> Route Map
          </button>
          <button
            onClick={() => setActiveTab('feasibility')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
              activeTab === 'feasibility'
                ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                : 'bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border-indigo-500/30'
            }`}
          >
            <ShieldCheck size={14} /> Feasibility Checker
          </button>
          <button
            onClick={() => handleOpenAddExpense()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
          >
            <Plus size={14} /> Log Expense
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Edit3 size={14} /> Edit Trip
          </button>
          <button
            onClick={() => setReportModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Printer size={14} /> Report
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            title="Delete trip"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Success banner if fixes applied or expenses updated */}
      {(fixSuccessMessage || assistantSuccessMessage || expenseSuccessMessage) && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
            <span>{fixSuccessMessage || assistantSuccessMessage || expenseSuccessMessage}</span>
          </div>
          <button onClick={() => { setFixSuccessMessage(''); setAssistantSuccessMessage(''); setExpenseSuccessMessage(''); }} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Overview Note */}
      <Card className="bg-gradient-to-r from-indigo-950/30 to-purple-950/20 border-indigo-500/20">
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {trip.overview || 'AI generated personalized travel schedule with day-by-day activities and budget breakdown.'}
        </p>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        {[
          { id: 'itinerary', label: `Day-wise Itinerary (${trip.itinerary?.length || 0} Days)` },
          { id: 'assistant', label: 'AI Trip Assistant 💬', badge: assistantPreview ? 'Preview Ready' : null },
          { id: 'map', label: 'Route Map & Navigation' },
          { id: 'budget', label: 'Estimated Budget Breakdown' },
          {
            id: 'expenses',
            label: `Expense Tracker 💳 (${expenses.length})`,
            badge: expenseAnalytics?.status === 'EXCEEDED' ? 'Exceeded' : (expenseAnalytics?.status === 'WARNING_80' ? '80% Spent' : null),
            badgeColor: expenseAnalytics?.status === 'EXCEEDED' ? 'text-rose-400' : 'text-amber-400'
          },
          {
            id: 'feasibility',
            label: `Feasibility & Pacing (${currentFeasibilityScore !== null && currentFeasibilityScore !== undefined ? `${currentFeasibilityScore}/100` : 'Analyze'})`,
            badgeColor: currentFeasibilityScore >= 85 ? 'text-emerald-400' : 'text-amber-400'
          },
          { id: 'packing', label: `Packing List (${packedCount}/${totalPackingCount})` },
          { id: 'prep', label: `Prep Tasks (${prepCompletedCount}/${totalPrepCount})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: ITINERARY */}
      {activeTab === 'itinerary' && (
        <div className="space-y-4">
          {trip.itinerary?.map((day) => (
            <Card key={day.day} className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                    D{day.day}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{day.title}</h3>
                    {day.theme && <p className="text-[11px] text-slate-400">{day.theme}</p>}
                  </div>
                </div>
              </div>

              {/* Activities list */}
              <div className="space-y-2.5">
                {day.activities?.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80 hover:border-slate-700/80 transition">
                    <div className="p-1.5 rounded-lg bg-slate-800/80 text-indigo-400 shrink-0 mt-0.5">
                      <Clock size={14} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-bold text-slate-200">{act.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-indigo-400 font-semibold px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                            {act.time}
                          </span>
                          {act.estimatedCost > 0 && (
                            <span className="text-[11px] text-emerald-400 font-semibold px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                              ₹{act.estimatedCost.toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{act.description}</p>
                      {act.location && (
                        <span className="text-[11px] text-slate-500 flex items-center gap-1 pt-0.5">
                          <MapPin size={11} /> {act.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Meals & Stay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-400">
                {day.meals && (
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                      <Utensils size={13} className="text-amber-400" /> Recommended Dining
                    </span>
                    <p className="text-[11px]"><strong className="text-slate-300">Breakfast:</strong> {day.meals.breakfast || 'Local breakfast specialty'}</p>
                    <p className="text-[11px]"><strong className="text-slate-300">Lunch:</strong> {day.meals.lunch || 'Regional lunch spot'}</p>
                    <p className="text-[11px]"><strong className="text-slate-300">Dinner:</strong> {day.meals.dinner || 'Celebrated dinner venue'}</p>
                  </div>
                )}
                {day.stay && (
                  <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1">
                    <span className="font-semibold text-slate-200 flex items-center gap-1.5 mb-1.5">
                      <Hotel size={13} className="text-indigo-400" /> Accommodation Target
                    </span>
                    <p className="text-[11px] leading-relaxed text-slate-300">{day.stay}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Context-Aware AI Trip Assistant */}
          {renderAssistantWidget()}
        </div>
      )}

      {/* TAB: CONTEXT-AWARE AI TRIP ASSISTANT */}
      {activeTab === 'assistant' && (
        <div className="space-y-4">
          {renderAssistantWidget()}
        </div>
      )}

      {/* TAB: ROUTE MAP & NAVIGATION */}
      {activeTab === 'map' && (
        <TripRouteMap trip={trip} onTripUpdated={setTrip} />
      )}

      {/* TAB 2: BUDGET BREAKDOWN */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card>
              <span className="text-xs text-slate-400 font-medium">Total Estimated Budget</span>
              <div className="text-2xl font-bold text-white mt-1">₹{trip.totalBudget?.toLocaleString('en-IN')}</div>
              <span className="text-xs text-slate-500 block mt-1">For {trip.travelersCount} traveler{trip.travelersCount > 1 ? 's' : ''}</span>
            </Card>
            <Card>
              <span className="text-xs text-slate-400 font-medium">Estimated Per Person</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">₹{trip.budgetPerPerson?.toLocaleString('en-IN')}</div>
              <span className="text-xs text-slate-500 block mt-1">Calculated share</span>
            </Card>
            <Card>
              <span className="text-xs text-slate-400 font-medium">Travel Style Target</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">{trip.travelStyle}</div>
              <span className="text-xs text-slate-500 block mt-1">Comfort tier</span>
            </Card>
          </div>

          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Category Cost Breakdown</h3>
            <div className="space-y-3.5">
              {[
                { name: 'Transportation (Flights / Trains / Local Cabs)', amount: budget.transportation || 0, color: 'bg-blue-500' },
                { name: 'Accommodation (Hotels / Homestays / Resorts)', amount: budget.accommodation || 0, color: 'bg-purple-500' },
                { name: 'Food & Dining (Breakfast, Lunch & Dinner)', amount: budget.food || 0, color: 'bg-emerald-500' },
                { name: 'Activities & Sightseeing Entry Fees', amount: budget.activities || 0, color: 'bg-amber-500' },
                { name: 'Miscellaneous & Contingency Reserve', amount: budget.miscellaneous || 0, color: 'bg-slate-500' }
              ].map((cat, idx) => {
                const total = trip.totalBudget || 1;
                const pct = Math.min(100, Math.round((cat.amount / total) * 100));
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-300 font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[11px]">{pct}%</span>
                        <span className="text-white font-bold">₹{cat.amount?.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div className="w-full h-2.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full ${cat.color} rounded-full transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mt-4 leading-relaxed">
              <strong>Estimate Notice:</strong> {budget.isEstimateNotice || 'Budgets are reasonable market approximations for planning purposes. Actual costs vary based on seasonality, booking time, and individual choices. No live bookings have been placed.'}
            </div>
          </Card>
        </div>
      )}

      {/* TAB: REAL-TIME EXPENSE TRACKER */}
      {activeTab === 'expenses' && renderExpenseTracker()}

      {/* TAB 3: FEASIBILITY & PACING CHECKER */}
      {activeTab === 'feasibility' && (
        <div className="space-y-6">
          {/* Hero Feasibility Score Card */}
          <Card className="bg-gradient-to-br from-[#0E131F] via-[#111827] to-[#151C2C] border-indigo-500/30 p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600/30 to-violet-600/20 border border-indigo-500/40 flex flex-col items-center justify-center shrink-0">
                  <span className={`text-2xl font-extrabold ${getFeasibilityColor(currentFeasibilityScore)}`}>
                    {currentFeasibilityScore ?? '--'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">/ 100</span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-bold text-white">AI Feasibility & Pacing Report</h3>
                    {currentFeasibilityScore !== null && (
                      <Badge variant={getFeasibilityBadgeVariant(currentFeasibilityScore)}>
                        {feasibilityReport?.rating || 'Analyzed'}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 max-w-xl leading-relaxed">
                    {feasibilityReport?.summary || 'Evaluating activity density, transportation buffers, operating hours, and budget limitations...'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
                <button
                  onClick={handleRunFeasibility}
                  disabled={checkingFeasibility}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition disabled:opacity-50"
                >
                  <RefreshCw size={14} className={checkingFeasibility ? 'animate-spin' : ''} />
                  {checkingFeasibility ? 'Analyzing...' : 'Re-Check'}
                </button>

                {feasibilityReport && feasibilityReport.issues?.length > 0 && (
                  <button
                    onClick={() => handleApplyFix('ALL')}
                    disabled={applyingFix}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 transition disabled:opacity-50"
                  >
                    {applyingFix ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                    {applyingFix ? 'Optimizing Schedule...' : 'Auto-Optimize All Issues'}
                  </button>
                )}
              </div>
            </div>

            {/* 4 Dimension Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-6">
              {[
                {
                  label: 'Day Pacing & Timing',
                  score: feasibilityReport?.metrics?.pacingScore ?? 85,
                  desc: 'Activity hours & daily rest',
                  icon: Clock,
                  color: 'text-indigo-400'
                },
                {
                  label: 'Transit & Travel Buffers',
                  score: feasibilityReport?.metrics?.transitFeasibility ?? 80,
                  desc: 'Travel time between venues',
                  icon: MapPin,
                  color: 'text-purple-400'
                },
                {
                  label: 'Budget Health',
                  score: feasibilityReport?.metrics?.budgetHealth ?? 90,
                  desc: 'Activity costs vs budget target',
                  icon: Wallet,
                  color: 'text-emerald-400'
                },
                {
                  label: 'Preference Alignment',
                  score: feasibilityReport?.metrics?.preferenceMatch ?? 95,
                  desc: 'Travel style & comfort fit',
                  icon: Users,
                  color: 'text-cyan-400'
                }
              ].map((m, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400 flex items-center gap-1.5">
                      <m.icon size={13} className={m.color} /> {m.label}
                    </span>
                    <span className={`font-bold ${getFeasibilityColor(m.score)}`}>{m.score}%</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full"
                      style={{ width: `${m.score}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-slate-500 block truncate">{m.desc}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Actionable Issues & Conflicts */}
          <Card className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <AlertTriangle size={16} className="text-amber-400" />
                  Detected Constraints & Scheduling Conflicts ({feasibilityReport?.issues?.length || 0})
                </h3>
                <p className="text-xs text-slate-400">
                  Actionable suggestions to prevent travel bottlenecks, closed gates, or over-exhaustion.
                </p>
              </div>
            </div>

            {feasibilityReport?.issues && feasibilityReport.issues.length > 0 ? (
              <div className="space-y-3 pt-2">
                {feasibilityReport.issues.map((issue) => {
                  const isHigh = issue.severity === 'high';
                  return (
                    <div
                      key={issue.id}
                      className={`p-4 rounded-xl border transition space-y-2 ${
                        isHigh
                          ? 'bg-rose-500/5 border-rose-500/30'
                          : 'bg-[#0B0F19] border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                                isHigh
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              }`}
                            >
                              {issue.severity} Priority
                            </span>
                            <span className="text-[11px] font-semibold text-slate-400">
                              {issue.type.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <h4 className="text-xs font-bold text-white">{issue.title}</h4>
                        </div>

                        {issue.autoFixAction && (
                          <button
                            onClick={() => handleApplyFix(issue.id)}
                            disabled={applyingFix}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-600/80 hover:bg-indigo-600 text-white transition shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <Zap size={12} /> Apply Fix
                          </button>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{issue.description}</p>

                      <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800 text-[11px] text-indigo-300 flex items-start gap-2">
                        <span className="font-bold text-indigo-400 shrink-0">Recommendation:</span>
                        <span>{issue.recommendation}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center space-y-2">
                <CheckCircle2 size={24} className="text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">No Scheduling Conflicts or Bottlenecks Detected</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Activity times, travel distances, attraction opening hours, and budget allocations are verified and well-paced.
                </p>
              </div>
            )}
          </Card>

          {/* Day-by-Day Feasibility Analysis */}
          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-white">Day-by-Day Pacing & Active Hours Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {feasibilityReport?.dayAnalysis?.map((d) => (
                <div key={d.day} className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">Day {d.day}</span>
                    <Badge
                      variant={
                        d.pacingRating === 'Comfortable'
                          ? 'success'
                          : d.pacingRating === 'Moderate'
                          ? 'primary'
                          : 'danger'
                      }
                    >
                      {d.pacingRating}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                    <div>
                      <span className="block text-[10px] text-slate-500">Active Time</span>
                      <strong className="text-slate-200">{d.estimatedActiveHours} Hours</strong>
                    </div>
                    <div>
                      <span className="block text-[10px] text-slate-500">Transit Buffer</span>
                      <strong className="text-slate-200">{d.estimatedTransitMinutes} Mins</strong>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2 mt-4">
              <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
              <span>
                <strong>Data Notice:</strong> {feasibilityReport?.disclaimer || 'Transit estimates and attraction windows are based on standard regional travel patterns; real-time urban traffic, seasonal hours, and public holidays may cause variations.'}
              </span>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 4: PACKING CHECKLIST */}
      {activeTab === 'packing' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-200">AI Packing Checklist</h3>
              <p className="text-xs text-slate-400">Tailored to your destination, duration, and chosen activities</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              {packedCount} of {totalPackingCount} Packed
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-300"
              style={{ width: `${totalPackingCount ? Math.round((packedCount / totalPackingCount) * 100) : 0}%` }}
            />
          </div>

          <div className="space-y-2 pt-2">
            {trip.packingChecklist?.map((item, idx) => (
              <div
                key={idx}
                onClick={() => handleTogglePackingItem(idx)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  item.checked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through opacity-75'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                {item.checked ? <CheckSquare size={16} className="text-emerald-400 shrink-0" /> : <Square size={16} className="text-slate-500 shrink-0" />}
                <span className="text-xs font-medium flex-1">{item.item}</span>
                {item.category && (
                  <span className="text-[10px] text-slate-500 px-2 py-0.5 rounded bg-slate-800/80 border border-slate-800">
                    {item.category}
                  </span>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 5: PREPARATION CHECKLIST */}
      {activeTab === 'prep' && (
        <Card className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-200">Pre-Trip Preparation</h3>
              <p className="text-xs text-slate-400">Essential preparations to complete before departure</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              {prepCompletedCount} of {totalPrepCount} Completed
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-indigo-500 rounded-full transition-all duration-300"
              style={{ width: `${totalPrepCount ? Math.round((prepCompletedCount / totalPrepCount) * 100) : 0}%` }}
            />
          </div>

          <div className="space-y-2 pt-2">
            {trip.preparationChecklist?.map((prep, idx) => (
              <div
                key={idx}
                onClick={() => handleTogglePrepItem(idx)}
                className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                  prep.checked
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 line-through opacity-75'
                    : 'bg-[#0B0F19] border-slate-800 text-slate-200 hover:border-slate-700'
                }`}
              >
                {prep.checked ? <CheckSquare size={16} className="text-emerald-400 shrink-0" /> : <Square size={16} className="text-slate-500 shrink-0" />}
                <span className="text-xs font-medium flex-1">{prep.task}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* EDIT TRIP MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl relative my-8 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0E131F]">
              <div className="flex items-center gap-2">
                <Edit3 size={18} className="text-indigo-400" />
                <h3 className="text-base font-bold text-white">Edit Trip Details</h3>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Trip Name</label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Starting Location</label>
                  <input
                    type="text"
                    required
                    value={editForm.startingLocation}
                    onChange={(e) => setEditForm({ ...editForm, startingLocation: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={editForm.destination}
                    onChange={(e) => setEditForm({ ...editForm, destination: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Departure Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.departureDate}
                    onChange={(e) => setEditForm({ ...editForm, departureDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Return Date</label>
                  <input
                    type="date"
                    required
                    value={editForm.returnDate}
                    onChange={(e) => setEditForm({ ...editForm, returnDate: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Travelers Count</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={editForm.travelersCount}
                    onChange={(e) => setEditForm({ ...editForm, travelersCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-medium text-slate-300">Total Budget (₹)</label>
                    <span className="text-[11px] text-indigo-400 font-medium">
                      ≈ ₹{Math.round(editForm.totalBudget / Math.max(1, editForm.travelersCount)).toLocaleString('en-IN')}/person
                    </span>
                  </div>
                  <input
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={editForm.totalBudget}
                    onChange={(e) => setEditForm({ ...editForm, totalBudget: Math.max(1000, parseInt(e.target.value, 10) || 1000) })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Travel Style</label>
                  <select
                    value={editForm.travelStyle}
                    onChange={(e) => setEditForm({ ...editForm, travelStyle: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Budget">Budget</option>
                    <option value="Standard">Standard</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="draft">Draft</option>
                    <option value="planned">Planned</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Overview Summary</label>
                <textarea
                  rows={3}
                  value={editForm.overview}
                  onChange={(e) => setEditForm({ ...editForm, overview: e.target.value })}
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingEdit ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {isSavingEdit ? 'Saving Changes...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 size={18} className="text-rose-400" /> Delete This Trip?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to delete <strong className="text-white">"{trip.name}"</strong>? All day-wise schedules, budget breakdowns, checklists, and linked tasks will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTrip}
                disabled={isDeleting}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {isDeleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {isDeleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PRINTABLE REPORT MODAL */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
          <style>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #trip-printable-report, #trip-printable-report * {
                visibility: visible !important;
              }
              #trip-printable-report {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                max-width: 100% !important;
                margin: 0 !important;
                padding: 24px !important;
                background: #ffffff !important;
                color: #000000 !important;
                border: none !important;
                box-shadow: none !important;
              }
              @page {
                margin: 1.2cm;
              }
            }
          `}</style>
          <div id="trip-printable-report" className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 print:border-black mb-4">
              <div>
                <h2 className="text-lg font-bold text-white print:text-black">{trip.name} - Travel Report</h2>
                <p className="text-xs text-slate-400 print:text-gray-600">Generated by LifePilot AI</p>
              </div>
              <div className="flex items-center gap-2 print:hidden">
                <button
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 text-white flex items-center gap-1"
                >
                  <Printer size={14} /> Print
                </button>
                <button onClick={() => setReportModal(false)} className="text-slate-400 text-sm">✕</button>
              </div>
            </div>

            <div className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#0B0F19] print:bg-gray-100">
                <div><strong>Route:</strong> {trip.startingLocation} → {trip.destination}</div>
                <div><strong>Duration:</strong> {trip.durationDays || trip.itinerary?.length} Days</div>
                <div><strong>Dates:</strong> {departureFormatted} to {returnFormatted}</div>
                <div><strong>Travelers:</strong> {trip.travelersCount} ({trip.travelStyle})</div>
                <div><strong>Estimated Budget:</strong> ₹{trip.totalBudget?.toLocaleString('en-IN')}</div>
                <div><strong>Per Person:</strong> ₹{trip.budgetPerPerson?.toLocaleString('en-IN')}</div>
              </div>

              <div>
                <h4 className="font-bold mb-1 text-slate-200 print:text-black">Estimated Budget Breakdown:</h4>
                <div className="grid grid-cols-2 gap-1.5 p-2 rounded-lg bg-[#0B0F19] print:bg-gray-50 text-[11px]">
                  <div>Transit: ₹{budget.transportation?.toLocaleString('en-IN') || 0}</div>
                  <div>Stay: ₹{budget.accommodation?.toLocaleString('en-IN') || 0}</div>
                  <div>Food: ₹{budget.food?.toLocaleString('en-IN') || 0}</div>
                  <div>Activities: ₹{budget.activities?.toLocaleString('en-IN') || 0}</div>
                  <div>Misc: ₹{budget.miscellaneous?.toLocaleString('en-IN') || 0}</div>
                  <div>Total: ₹{budget.totalEstimated?.toLocaleString('en-IN') || 0}</div>
                </div>
              </div>

              <div>
                <h4 className="font-bold mb-2 text-slate-200 print:text-black">Day-wise Schedule Highlights:</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                  {trip.itinerary?.map((d) => (
                    <div key={d.day} className="border-l-2 border-indigo-500 pl-3 py-1">
                      <strong className="text-white print:text-black">Day {d.day}: {d.title}</strong>
                      <p className="text-slate-400 print:text-gray-600 text-[11px]">{d.theme}</p>
                      <div className="text-[10px] text-slate-500 print:text-gray-500 mt-0.5">
                        {d.activities?.map((a) => `${a.time} - ${a.title}`).join(' • ')}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {trip.packingChecklist && trip.packingChecklist.length > 0 && (
                <div>
                  <h4 className="font-bold mb-1 text-slate-200 print:text-black">Packing Checklist ({trip.packingChecklist.length} Items):</h4>
                  <p className="text-[11px] text-slate-400 print:text-gray-600">
                    {trip.packingChecklist.map((p) => p.item).join(', ')}
                  </p>
                </div>
              )}

              <p className="text-[10px] text-slate-500 print:text-gray-500 pt-2 border-t border-slate-800 print:border-gray-300">
                Notice: All figures are estimated approximations based on standard travel patterns; no live bookings have been placed.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ADD / EDIT EXPENSE MODAL */}
      {showAddExpenseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <CreditCard size={18} className="text-indigo-400" />
                {editingExpense ? 'Edit Logged Expense' : 'Log Travel Expense'}
              </h3>
              <button
                onClick={() => { setShowAddExpenseModal(false); setEditingExpense(null); }}
                className="text-slate-400 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            {expenseError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{expenseError}</span>
              </div>
            )}

            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Category</label>
                <select
                  value={newExpense.category}
                  onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="Transportation">Transportation (Flights, Trains, Cabs, Fuel)</option>
                  <option value="Accommodation">Accommodation (Hotels, Resorts, Homestays)</option>
                  <option value="Food">Food & Dining (Restaurants, Cafes, Groceries)</option>
                  <option value="Activities">Activities (Entry Tickets, Rentals, Guides)</option>
                  <option value="Miscellaneous">Miscellaneous (Shopping, Souvenirs, Tips)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Amount Spent (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="e.g. 1500"
                  value={newExpense.amount}
                  onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Expense Date</label>
                <input
                  type="date"
                  required
                  value={newExpense.expenseDate}
                  onChange={(e) => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Description / Notes</label>
                <input
                  type="text"
                  placeholder="e.g. 'Airport cab to hotel', 'Dinner at Fisherman Wharf'..."
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddExpenseModal(false); setEditingExpense(null); }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 transition border border-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingExpense || !newExpense.amount}
                  className="px-5 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSavingExpense && <Loader2 size={14} className="animate-spin" />}
                  {isSavingExpense ? 'Saving...' : (editingExpense ? 'Update Expense' : 'Save Expense')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
