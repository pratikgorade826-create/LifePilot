import React, { useState, useEffect } from 'react';
import {
  Vote,
  Plus,
  CheckCircle2,
  Clock,
  Trophy,
  Loader2,
  X,
  AlertCircle,
  HelpCircle
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const GroupPollsView = ({ trip, currentUser }) => {
  const [polls, setPolls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [votingPollId, setVotingPollId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form State
  const [newPollTitle, setNewPollTitle] = useState('');
  const [newPollCategory, setNewPollCategory] = useState('hotel');
  const [newPollOptions, setNewPollOptions] = useState(['', '']);

  const currentUserId = currentUser?._id ? currentUser._id.toString() : '';

  useEffect(() => {
    if (trip?._id) {
      loadPolls();
    }
  }, [trip?._id]);

  const loadPolls = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const res = await tripsAPI.getPolls(trip._id);
      setPolls(res.data.polls || []);
    } catch (err) {
      console.error('Failed to load polls:', err);
      setErrorMsg('Failed to load trip polls.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOptionField = () => {
    setNewPollOptions(prev => [...prev, '']);
  };

  const handleOptionChange = (idx, value) => {
    setNewPollOptions(prev => {
      const copy = [...prev];
      copy[idx] = value;
      return copy;
    });
  };

  const handleCreatePoll = async (e) => {
    e.preventDefault();
    if (!newPollTitle.trim()) {
      setErrorMsg('Please enter a poll title or question.');
      return;
    }
    const cleanOptions = newPollOptions.map(o => o.trim()).filter(Boolean);
    if (cleanOptions.length < 2) {
      setErrorMsg('Please provide at least 2 distinct options.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const res = await tripsAPI.createPoll(trip._id, {
        title: newPollTitle.trim(),
        category: newPollCategory,
        options: cleanOptions
      });

      setSuccessMsg(`Poll "${res.data.poll.title}" created!`);
      setShowCreateModal(false);
      setNewPollTitle('');
      setNewPollOptions(['', '']);
      await loadPolls();
    } catch (err) {
      console.error('Create poll error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to create poll.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVote = async (pollId, optionIndex) => {
    setVotingPollId(pollId);
    try {
      const res = await tripsAPI.votePoll(trip._id, pollId, optionIndex);
      setPolls(prev => prev.map(p => p._id === pollId ? res.data.poll : p));
    } catch (err) {
      console.error('Voting error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to record vote.');
    } finally {
      setVotingPollId(null);
    }
  };

  const handleClosePoll = async (pollId) => {
    if (!window.confirm('Close this poll and declare the winning choice?')) return;

    try {
      const res = await tripsAPI.closePoll(trip._id, pollId);
      setPolls(prev => prev.map(p => p._id === pollId ? res.data.poll : p));
      setSuccessMsg(`Poll closed! Winning choice: "${res.data.poll.winner}".`);
    } catch (err) {
      console.error('Failed to close poll:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to close poll.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/20 border border-indigo-500/30">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
            <Vote size={22} />
          </div>
          <div>
            <h3 className="text-base font-bold text-white">Group Decisions & Voting</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Vote on stays, dining spots, transport, and attractions. Avoid endless group chat arguments!
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 transition whitespace-nowrap"
        >
          <Plus size={16} />
          Create New Poll
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

      {/* Polls Feed */}
      {loading ? (
        <Card className="flex flex-col items-center justify-center p-12 text-slate-400">
          <Loader2 size={32} className="animate-spin text-indigo-400 mb-3" />
          <p className="text-sm">Loading group polls...</p>
        </Card>
      ) : polls.length === 0 ? (
        <Card className="p-10 text-center text-slate-400 border-dashed border-slate-800">
          <Vote size={36} className="mx-auto text-slate-600 mb-3" />
          <h4 className="text-sm font-bold text-slate-300">No polls created yet</h4>
          <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
            Create a poll to decide where to stay, eat, or what activities to schedule together!
          </p>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold hover:bg-indigo-600/30 transition"
          >
            Create First Poll
          </button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {polls.map((poll) => {
            const isClosed = poll.status === 'closed';
            const totalVotes = (poll.options || []).reduce((sum, opt) => sum + (opt.votes?.length || 0), 0);

            return (
              <Card
                key={poll._id}
                className={`p-5 space-y-4 border transition ${
                  isClosed ? 'border-slate-800 bg-slate-900/60' : 'border-indigo-500/30 bg-slate-900/90'
                }`}
              >
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-800">
                  <div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-indigo-300 border border-slate-700 inline-block mb-1">
                      {poll.category}
                    </span>
                    <h4 className="text-sm font-bold text-white leading-snug">{poll.title}</h4>
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      By {poll.creatorName} • {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {isClosed ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                        Closed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleClosePoll(poll._id)}
                        className="text-[11px] font-semibold text-slate-400 hover:text-amber-400 transition"
                        title="Close Poll"
                      >
                        Close
                      </button>
                    )}
                  </div>
                </div>

                {/* Winning banner if closed */}
                {isClosed && poll.winner && (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs flex items-center gap-2 text-amber-300 font-semibold">
                    <Trophy size={16} className="text-amber-400 shrink-0" />
                    <span>Winner: {poll.winner}</span>
                  </div>
                )}

                {/* Options List */}
                <div className="space-y-2.5">
                  {(poll.options || []).map((opt, optIdx) => {
                    const voteCount = opt.votes?.length || 0;
                    const pct = totalVotes > 0 ? Math.round((voteCount / totalVotes) * 100) : 0;
                    const hasVotedThis = (opt.votes || []).some(
                      v => v.userId && v.userId.toString() === currentUserId
                    );

                    return (
                      <button
                        key={optIdx}
                        disabled={isClosed || votingPollId === poll._id}
                        onClick={() => handleVote(poll._id, optIdx)}
                        className={`relative w-full p-3 rounded-xl border text-left transition overflow-hidden text-xs group ${
                          hasVotedThis
                            ? 'border-indigo-500 bg-indigo-950/30'
                            : 'border-slate-800 bg-slate-950/80 hover:border-slate-700'
                        } ${isClosed ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        {/* Progress bar background */}
                        <div
                          className={`absolute inset-0 opacity-15 transition-all duration-500 ${
                            hasVotedThis ? 'bg-indigo-500' : 'bg-slate-600'
                          }`}
                          style={{ width: `${pct}%` }}
                        />

                        <div className="relative flex items-center justify-between z-10">
                          <div className="flex items-center gap-2">
                            <span className={`w-4 h-4 rounded-full flex items-center justify-center border text-[10px] ${
                              hasVotedThis
                                ? 'bg-indigo-600 border-indigo-400 text-white'
                                : 'border-slate-600 group-hover:border-slate-400'
                            }`}>
                              {hasVotedThis && <CheckCircle2 size={12} />}
                            </span>
                            <span className={`font-semibold ${hasVotedThis ? 'text-white' : 'text-slate-200'}`}>
                              {opt.text}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 text-slate-400 text-[11px] font-semibold">
                            <span>{voteCount}</span>
                            <span className="text-slate-500">({pct}%)</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Poll Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                <Vote size={20} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Create a Group Poll</h3>
                <p className="text-xs text-slate-400">Put a travel decision to a team vote</p>
              </div>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Poll Question / Title *</label>
                <input
                  type="text"
                  required
                  value={newPollTitle}
                  onChange={(e) => setNewPollTitle(e.target.value)}
                  placeholder="E.g., Which sunset dinner spot should we book for Day 2?"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Category</label>
                <select
                  value={newPollCategory}
                  onChange={(e) => setNewPollCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="hotel">Hotel & Accommodation</option>
                  <option value="restaurant">Restaurants & Dining</option>
                  <option value="attraction">Tourist Attractions</option>
                  <option value="transport">Transport Mode</option>
                  <option value="activity">Activities & Nightlife</option>
                  <option value="dates">Travel Dates</option>
                  <option value="general">General Topic</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 block">Voting Options (Minimum 2)</label>
                {newPollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    required={i < 2}
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    placeholder={`Option ${i + 1}`}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                ))}
                {newPollOptions.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddOptionField}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-1 transition"
                  >
                    <Plus size={14} /> Add Another Option
                  </button>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-2.5 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
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
                  Publish Poll
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

