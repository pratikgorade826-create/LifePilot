import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Plus,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  CheckCircle2,
  Trash2,
  DollarSign,
  Loader2,
  X,
  AlertCircle,
  Receipt,
  Users
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const GroupExpensesView = ({ trip, currentUser }) => {
  const [expenses, setExpenses] = useState([]);
  const [settlementReport, setSettlementReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const members = trip.members && trip.members.length > 0
    ? trip.members
    : [
        { userId: trip.ownerId, name: currentUser?.name || 'Alex Mercer' },
        { name: 'Rohan Sharma' },
        { name: 'Sneha Patel' }
      ];

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Food');
  const [amount, setAmount] = useState('');
  const [payerName, setPayerName] = useState(currentUser?.name || members[0]?.name || 'Alex Mercer');
  const [splitType, setSplitType] = useState('equal');
  const [selectedParticipants, setSelectedParticipants] = useState(members.map(m => m.name));
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (trip?._id) {
      loadExpensesAndSettlements();
    }
  }, [trip?._id]);

  const loadExpensesAndSettlements = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const [expRes, setRes] = await Promise.all([
        tripsAPI.getGroupExpenses(trip._id),
        tripsAPI.getSettlements(trip._id)
      ]);
      setExpenses(expRes.data.expenses || []);
      setSettlementReport(setRes.data.report || null);
    } catch (err) {
      console.error('Failed to load group expenses:', err);
      setErrorMsg('Failed to load shared expenses.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleParticipant = (name) => {
    setSelectedParticipants(prev =>
      prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
    );
  };

  const handleAddExpense = async (e) => {
    e.preventDefault();
    const parsedAmount = parseFloat(amount);
    if (!title.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Please enter a valid description and positive amount.');
      return;
    }
    if (selectedParticipants.length === 0) {
      setErrorMsg('Please select at least one participating traveler.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const payerMember = members.find(m => m.name === payerName);
      const payerObj = {
        userId: payerMember?.userId || currentUser?._id,
        userName: payerName
      };

      const share = Math.round((parsedAmount / selectedParticipants.length) * 100) / 100;
      const participantsList = selectedParticipants.map(name => {
        const m = members.find(mem => mem.name === name);
        return {
          userId: m?.userId,
          userName: name,
          shareAmount: share,
          isSettled: name === payerName
        };
      });

      await tripsAPI.addGroupExpense(trip._id, {
        title: title.trim(),
        category,
        amount: parsedAmount,
        paidBy: payerObj,
        splitType,
        participants: participantsList,
        notes
      });

      setSuccessMsg(`Added shared expense: "₹${parsedAmount.toLocaleString('en-IN')}: ${title}"!`);
      setShowAddModal(false);
      setTitle('');
      setAmount('');
      setNotes('');
      await loadExpensesAndSettlements();
    } catch (err) {
      console.error('Failed to add expense:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to save expense.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (!window.confirm('Delete this shared expense?')) return;
    try {
      await tripsAPI.deleteGroupExpense(trip._id, expenseId);
      await loadExpensesAndSettlements();
    } catch (err) {
      console.error('Delete expense error:', err);
    }
  };

  const handleSettle = async (fromName, toName, amt) => {
    try {
      await tripsAPI.settleExpenseDebt(trip._id, { fromName, toName, amount: amt });
      setSuccessMsg(`Settlement of ₹${amt.toLocaleString('en-IN')} between ${fromName} and ${toName} recorded!`);
      await loadExpensesAndSettlements();
    } catch (err) {
      console.error('Settlement error:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/20 border border-indigo-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Receipt size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Group Expenses & Settlement</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Split hotel bills, meals, and taxi fares fairly. Smart algorithm minimizes transfers!
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
        >
          <Plus size={16} />
          Add Shared Expense
        </button>
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

      {/* Simplified Debt Settlement Summary (Splitwise style) */}
      {settlementReport && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Member Balance Card */}
          <Card className="p-5 border-slate-800 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Users size={16} className="text-indigo-400" />
              Member Balances (Total: ₹{(settlementReport.totalGroupExpense || 0).toLocaleString('en-IN')})
            </h4>

            <div className="space-y-2">
              {(settlementReport.memberBalances || []).map((mb, i) => (
                <div
                  key={i}
                  className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-white block">{mb.name}</span>
                    <span className="text-[11px] text-slate-400">
                      Paid ₹{mb.totalPaid?.toLocaleString('en-IN')} • Share ₹{mb.totalOwed?.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className={`font-bold block ${
                      mb.netBalance > 0 ? 'text-emerald-400' : (mb.netBalance < 0 ? 'text-rose-400' : 'text-slate-400')
                    }`}>
                      {mb.netBalance > 0 ? `+₹${mb.netBalance.toLocaleString('en-IN')}` : (mb.netBalance < 0 ? `-₹${Math.abs(mb.netBalance).toLocaleString('en-IN')}` : 'Settled')}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {mb.netBalance > 0 ? 'gets back' : (mb.netBalance < 0 ? 'owes' : 'balanced')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Transfer Settlements Card */}
          <Card className="p-5 border-emerald-500/30 bg-gradient-to-br from-slate-900 to-emerald-950/10 space-y-3">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400" />
              Simplified Settlement Transfers
            </h4>
            <p className="text-xs text-slate-400">
              Optimal transactions to settle all debts with minimum payments.
            </p>

            {settlementReport.settlements?.length === 0 ? (
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-center text-slate-400 text-xs">
                🎉 All expenses are fully settled! No pending debt transfers.
              </div>
            ) : (
              <div className="space-y-2.5">
                {settlementReport.settlements?.map((s, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-rose-300">{s.fromName}</span>
                      <ArrowRight size={14} className="text-slate-500" />
                      <span className="font-bold text-emerald-300">{s.toName}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-bold text-white text-sm">₹{s.amount?.toLocaleString('en-IN')}</span>
                      <button
                        onClick={() => handleSettle(s.fromName, s.toName, s.amount)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30 transition"
                      >
                        Settle
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Expense History List */}
      <Card className="p-5 border-slate-800 space-y-3">
        <h4 className="text-sm font-bold text-white">Shared Expense Log ({expenses.length})</h4>

        {loading ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            <Loader2 size={24} className="animate-spin text-indigo-400 mx-auto mb-2" />
            Loading expenses...
          </div>
        ) : expenses.length === 0 ? (
          <p className="text-xs text-slate-500 italic p-4 text-center">No group expenses recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {expenses.map((exp) => (
              <div
                key={exp._id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 hover:border-slate-700 flex items-start justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-800 text-slate-300">
                      {exp.category}
                    </span>
                    <span className="font-bold text-white">{exp.title}</span>
                  </div>
                  <p className="text-slate-400 text-[11px] mt-1">
                    Paid by <strong className="text-slate-200">{exp.paidBy?.userName}</strong> • Split across {exp.participants?.length || 1} people
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-bold text-white text-sm">₹{exp.amount?.toLocaleString('en-IN')}</span>
                  <button
                    onClick={() => handleDeleteExpense(exp._id)}
                    className="p-1 text-slate-500 hover:text-rose-400 transition"
                    title="Delete Expense"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add Shared Expense Modal */}
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
                <Receipt size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Add Group Expense</h3>
                <p className="text-xs text-slate-400">Record a shared bill and split it automatically</p>
              </div>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Expense Description *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="E.g., Baga Beach Shack Seafood Dinner"
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Total Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="8000"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Transportation">Transportation</option>
                    <option value="Accommodation">Accommodation</option>
                    <option value="Food">Food & Dining</option>
                    <option value="Activities">Activities & Tickets</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Local Transport">Local Transport</option>
                    <option value="Miscellaneous">Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Paid By</label>
                <select
                  value={payerName}
                  onChange={(e) => setPayerName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  {members.map((m, i) => (
                    <option key={i} value={m.name}>{m.name} (Payer)</option>
                  ))}
                </select>
              </div>

              {/* Participants selection */}
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">
                  Split With (Auto Equal Split: ₹{selectedParticipants.length > 0 && parseFloat(amount) > 0 ? (Math.round(parseFloat(amount) / selectedParticipants.length)).toLocaleString('en-IN') : 0}/person)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {members.map((m, i) => {
                    const isSelected = selectedParticipants.includes(m.name);
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => handleToggleParticipant(m.name)}
                        className={`p-2.5 rounded-xl border text-left text-xs transition flex items-center justify-between ${
                          isSelected
                            ? 'bg-indigo-950/40 border-indigo-500 text-white'
                            : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="font-semibold">{m.name}</span>
                        {isSelected && <CheckCircle2 size={14} className="text-indigo-400" />}
                      </button>
                    );
                  })}
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
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

