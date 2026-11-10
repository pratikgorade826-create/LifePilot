import React, { useState, useEffect, useRef } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  Bot,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  Zap,
  Check,
  X
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';

export const TravelCompanionView = ({ trip, onTripUpdated }) => {
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [applyingChanges, setApplyingChanges] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (trip?._id) {
      loadHistory();
    }
  }, [trip?._id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await tripsAPI.getCompanionHistory(trip._id);
      const hist = res.data.messages || [];
      if (hist.length === 0) {
        // Welcome message
        setMessages([
          {
            role: 'assistant',
            content: `Hello! I am your AI Travel Companion for **"${trip.name || trip.destination}"**.\n\nI have full context on your ${trip.durationDays || 5}-day itinerary, budget (₹${trip.totalBudget?.toLocaleString('en-IN')}), and saved landmarks. How can I help you today?`
          }
        ]);
      } else {
        setMessages(hist);
      }
    } catch (err) {
      console.error('Failed to load companion history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputValue;
    if (!text || !text.trim() || isSending) return;

    const userMsg = text.trim();
    setInputValue('');
    setIsSending(true);
    setErrorMsg('');

    // Optimistically append user message
    setMessages(prev => [...prev, { role: 'user', content: userMsg, timestamp: new Date() }]);

    try {
      const res = await tripsAPI.companionChat(trip._id, userMsg);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.reply,
          actionPreview: res.data.actionPreview,
          timestamp: new Date()
        }
      ]);
    } catch (err) {
      console.error('Companion chat error:', err);
      setErrorMsg('Failed to get companion response. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleApproveAction = async (proposedChanges) => {
    if (!proposedChanges) return;
    setApplyingChanges(true);
    setErrorMsg('');
    try {
      const res = await tripsAPI.assistantApply(trip._id, proposedChanges);
      setSuccessMsg('Changes approved and applied to your primary itinerary!');
      if (onTripUpdated) onTripUpdated(res.data.trip);
    } catch (err) {
      console.error('Apply changes error:', err);
      setErrorMsg(err.response?.data?.message || 'Failed to apply changes.');
    } finally {
      setApplyingChanges(false);
    }
  };

  const sampleChips = [
    'What is my plan for Day 2?',
    'How is my total budget allocated?',
    'Change Day 1 morning activity to 11:30 AM',
    'Increase total budget to 75000',
    'Change travel style to Luxury'
  ];

  return (
    <div className="space-y-4">
      {/* Header Banner */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-r from-slate-900 to-indigo-950/20 border border-indigo-500/30">
        <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
          <Bot size={22} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            Context-Aware AI Travel Companion
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Trip Active
            </span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ask questions, propose itinerary changes, and preview modifications with 1-click approval.
          </p>
        </div>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {errorMsg && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Chat Messages Feed */}
      <Card className="p-4 border-slate-800 bg-slate-950/80 min-h-[380px] max-h-[480px] overflow-y-auto space-y-3.5 flex flex-col">
        {loadingHistory ? (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs">
            <Loader2 size={24} className="animate-spin text-indigo-400 mb-2" />
            Connecting to your trip memory...
          </div>
        ) : (
          messages.map((msg, idx) => {
            const isBot = msg.role === 'assistant';
            return (
              <div
                key={idx}
                className={`flex items-start gap-2.5 max-w-[85%] text-xs ${isBot ? 'self-start' : 'self-end flex-row-reverse'}`}
              >
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs ${
                  isBot ? 'bg-indigo-600 text-white' : 'bg-slate-700 text-slate-200'
                }`}>
                  {isBot ? <Bot size={15} /> : <User size={15} />}
                </div>

                <div className="space-y-2">
                  <div className={`p-3 rounded-2xl leading-relaxed whitespace-pre-wrap ${
                    isBot
                      ? 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-sm'
                      : 'bg-indigo-600 text-white rounded-tr-sm font-medium'
                  }`}>
                    {msg.content}
                  </div>

                  {/* If assistant returned an action preview diff */}
                  {msg.actionPreview && (
                    <div className="p-3.5 rounded-xl bg-slate-900 border border-amber-500/40 text-xs space-y-2.5">
                      <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                        <span className="font-bold text-amber-400 text-[11px] uppercase tracking-wider flex items-center gap-1">
                          <Sparkles size={13} /> Proposed Itinerary Update
                        </span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-300">
                          {msg.actionPreview.actionType}
                        </span>
                      </div>

                      <p className="text-slate-300 text-[11px] font-medium">{msg.actionPreview.summary}</p>
                      <p className="text-slate-400 text-[11px] leading-relaxed">{msg.actionPreview.impactSummary}</p>

                      <div className="pt-1 flex items-center gap-2">
                        <button
                          onClick={() => handleApproveAction(msg.actionPreview.proposedChanges)}
                          disabled={applyingChanges}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1.5 transition shadow"
                        >
                          {applyingChanges ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                          Approve & Apply
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* Suggestion Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-[11px] text-slate-500 shrink-0 font-semibold">Try asking:</span>
        {sampleChips.map((chip, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(chip)}
            disabled={isSending}
            className="px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/40 text-slate-300 text-[11px] whitespace-nowrap transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input box */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendMessage();
        }}
        className="flex items-center gap-2"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder={`Ask anything about "${trip.name}" or request a change...`}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          disabled={isSending || !inputValue.trim()}
          className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow transition disabled:opacity-50"
        >
          {isSending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          <span>Send</span>
        </button>
      </form>
    </div>
  );
};

