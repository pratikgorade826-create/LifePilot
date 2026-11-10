import React, { useState } from 'react';
import { Sparkles, X, Loader2, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';

export const DayRegenerateModal = ({ trip, dayNumber, isOpen, onClose, onDayRegenerated }) => {
  const [feedback, setFeedback] = useState('');
  const [preferences, setPreferences] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');
  const [previewDay, setPreviewDay] = useState(null);
  const [explanation, setExplanation] = useState('');

  if (!isOpen) return null;

  const currentDay = (trip.itinerary || []).find(d => d.day === dayNumber) || {};

  const handleRegenerate = async (customPrompt) => {
    setIsGenerating(true);
    setError('');
    const promptToUse = customPrompt || feedback;

    try {
      const res = await tripsAPI.regenerateDay(trip._id, {
        dayNumber,
        feedback: promptToUse,
        preferences
      });

      setPreviewDay(res.data.day);
      setExplanation(res.data.explanation || 'New customized day schedule generated.');
    } catch (err) {
      console.error('Failed to regenerate day:', err);
      setError(err.response?.data?.message || 'Failed to regenerate day. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApply = () => {
    if (previewDay && onDayRegenerated) {
      onDayRegenerated(previewDay);
      onClose();
    }
  };

  const samplePresets = [
    { label: '🌧️ Rain-Safe Indoor Day', prompt: 'Convert this day into indoor museums, galleries, covered markets, and cozy cafes safe from rainfall.' },
    { label: '🏖️ Chill & Relaxed Pace', prompt: 'Reduce physical exertion, focus on late brunch, beach relaxation, and scenic sunset views.' },
    { label: '🏛️ Deep Cultural Immersion', prompt: 'Focus on historic colonial architecture, ancient temples, artisan workshops, and local storytelling.' },
    { label: '💰 Budget-Friendly Day', prompt: 'Replace high-cost activities with free heritage walks, public gardens, and iconic street food.' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
        >
          <X size={20} />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
            <Sparkles size={22} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Regenerate Day {dayNumber} with AI</h2>
            <p className="text-xs text-slate-400">Current: {currentDay.title || `Day ${dayNumber}`}</p>
          </div>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* Quick presets */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-slate-300 block mb-2">Quick Adjustment Presets:</label>
          <div className="grid grid-cols-2 gap-2">
            {samplePresets.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setFeedback(preset.prompt);
                  handleRegenerate(preset.prompt);
                }}
                className="p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700/60 text-left text-xs transition"
              >
                <div className="font-semibold text-slate-200">{preset.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom prompt input */}
        <div className="space-y-3 mb-5">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1.5">Custom Instructions or Constraints:</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="E.g., It's raining in the afternoon, swap watersports for indoor cooking class and art gallery..."
              rows={3}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <button
            onClick={() => handleRegenerate()}
            disabled={isGenerating}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 font-semibold text-xs text-white flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition disabled:opacity-50"
          >
            {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {isGenerating ? 'Generating New Day Plan...' : 'Generate Alternative Day Plan'}
          </button>
        </div>

        {/* Preview Generated Day */}
        {previewDay && (
          <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3 mb-5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Preview: Day {dayNumber}</span>
                <h4 className="text-sm font-bold text-white">{previewDay.title}</h4>
                <p className="text-xs text-slate-400">{previewDay.theme}</p>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Ready to Apply
              </span>
            </div>

            {explanation && (
              <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                "{explanation}"
              </p>
            )}

            <div className="space-y-2">
              {previewDay.activities?.map((act, i) => (
                <div key={i} className="flex items-start justify-between p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-xs">
                  <div>
                    <span className="font-semibold text-amber-400 mr-2">{act.time}</span>
                    <span className="font-bold text-white">{act.title}</span>
                    <p className="text-slate-400 text-[11px] mt-0.5">{act.description}</p>
                  </div>
                  <span className="font-semibold text-slate-300 shrink-0 ml-2">₹{act.estimatedCost || 0}</span>
                </div>
              ))}
            </div>

            <div className="pt-2 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setPreviewDay(null)}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={handleApply}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition"
              >
                <CheckCircle2 size={16} />
                Save & Apply to Trip
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

