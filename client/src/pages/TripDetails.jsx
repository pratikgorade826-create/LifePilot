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
  Compass,
  CheckSquare,
  Square
} from 'lucide-react';
import { tripsAPI, aiAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const TripDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('itinerary'); // 'itinerary' | 'budget' | 'packing' | 'prep'
  const [reportModal, setReportModal] = useState(false);
  const [naturalModifyText, setNaturalModifyText] = useState('');
  const [modifying, setModifying] = useState(false);

  useEffect(() => {
    loadTrip();
  }, [id]);

  const loadTrip = async () => {
    try {
      setLoading(true);
      const res = await tripsAPI.getOne(id);
      setTrip(res.data.trip);
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePackingItem = async (index) => {
    if (!trip) return;
    const updated = [...trip.packingChecklist];
    updated[index].checked = !updated[index].checked;

    try {
      setTrip({ ...trip, packingChecklist: updated });
      await tripsAPI.update(id, { packingChecklist: updated });
    } catch (err) {
      console.error('Failed to update packing item:', err);
    }
  };

  const handleTogglePrepItem = async (index) => {
    if (!trip) return;
    const updated = [...trip.preparationChecklist];
    updated[index].checked = !updated[index].checked;

    try {
      setTrip({ ...trip, preparationChecklist: updated });
      await tripsAPI.update(id, { preparationChecklist: updated });
    } catch (err) {
      console.error('Failed to update prep item:', err);
    }
  };

  const handleNaturalModify = async (e) => {
    e.preventDefault();
    if (!naturalModifyText.trim()) return;

    setModifying(true);
    try {
      // Re-query assistant with modifier context
      const prompt = `Modify the existing trip for ${trip.destination}. User requested: "${naturalModifyText}". Current itinerary duration: ${trip.itinerary?.length || 5} days, budget: ₹${trip.totalBudget}.`;
      const res = await tripsAPI.generate({
        prompt,
        destination: trip.destination,
        startingLocation: trip.startingLocation,
        durationDays: trip.itinerary?.length || 5,
        totalBudget: trip.totalBudget,
        travelersCount: trip.travelersCount,
        travelStyle: trip.travelStyle,
        interests: trip.interests
      });

      const updatedData = res.data.data;
      const saveRes = await tripsAPI.update(id, {
        overview: updatedData.overview || trip.overview,
        itinerary: updatedData.itinerary || trip.itinerary,
        budgetBreakdown: updatedData.budgetBreakdown || trip.budgetBreakdown,
        packingChecklist: updatedData.packingChecklist || trip.packingChecklist
      });

      setTrip(saveRes.data.trip);
      setNaturalModifyText('');
    } catch (err) {
      console.error('Failed to modify trip:', err);
    } finally {
      setModifying(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this trip permanently?')) return;
    try {
      await tripsAPI.delete(id);
      navigate('/trips');
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading itinerary details..." />;
  }

  if (!trip) {
    return (
      <div className="p-8 text-center text-slate-400">
        <p>Trip not found.</p>
        <Link to="/trips" className="text-indigo-400 underline text-sm mt-2 block">Back to Trips</Link>
      </div>
    );
  }

  const budget = trip.budgetBreakdown || {};

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/trips')}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-bold text-white">{trip.name}</h1>
              <Badge variant="primary">{trip.travelStyle}</Badge>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <MapPin size={13} className="text-slate-500" />
              <span>{trip.startingLocation} → {trip.destination}</span>
              <span>•</span>
              <Calendar size={13} className="text-slate-500" />
              <span>{new Date(trip.departureDate).toLocaleDateString()} to {new Date(trip.returnDate).toLocaleDateString()}</span>
              <span>•</span>
              <Users size={13} className="text-slate-500" />
              <span>{trip.travelersCount} Travelers</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => setReportModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition"
          >
            <Printer size={15} /> Printable Report
          </button>
          <button
            onClick={handleDelete}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition"
            title="Delete trip"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Overview Note */}
      <Card className="bg-gradient-to-r from-indigo-950/30 to-purple-950/20 border-indigo-500/20">
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          {trip.overview || 'AI generated personalized travel schedule.'}
        </p>
      </Card>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        {[
          { id: 'itinerary', label: `Day-wise Itinerary (${trip.itinerary?.length || 0})` },
          { id: 'budget', label: 'Estimated Budget Breakdown' },
          { id: 'packing', label: `Packing List (${trip.packingChecklist?.length || 0})` },
          { id: 'prep', label: `Prep Tasks (${trip.preparationChecklist?.length || 0})` }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
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
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-lg bg-indigo-500/15 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/20">
                    D{day.day}
                  </span>
                  <h3 className="text-sm font-bold text-white">{day.title}</h3>
                </div>
                {day.theme && <Badge variant="violet">{day.theme}</Badge>}
              </div>

              {/* Activities list */}
              <div className="space-y-3">
                {day.activities?.map((act, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-[#0B0F19] border border-slate-800/80">
                    <div className="p-1.5 rounded-lg bg-slate-800 text-indigo-400 shrink-0 mt-0.5">
                      <Clock size={14} />
                    </div>
                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-200">{act.title}</span>
                        <span className="text-[11px] text-indigo-400 font-medium">{act.time}</span>
                      </div>
                      <p className="text-xs text-slate-400">{act.description}</p>
                      {act.location && (
                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <MapPin size={10} /> {act.location}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Meals & Stay */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-xs text-slate-400">
                {day.meals && (
                  <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-1">Recommended Dining:</span>
                    <p className="text-[11px]">B: {day.meals.breakfast || 'Local breakfast'}</p>
                    <p className="text-[11px]">L: {day.meals.lunch || 'Regional lunch'}</p>
                    <p className="text-[11px]">D: {day.meals.dinner || 'Evening dining'}</p>
                  </div>
                )}
                {day.stay && (
                  <div className="p-2.5 rounded-lg bg-[#0B0F19] border border-slate-800">
                    <span className="font-semibold text-slate-300 block mb-1">Accommodation:</span>
                    <p className="text-[11px]">{day.stay}</p>
                  </div>
                )}
              </div>
            </Card>
          ))}

          {/* Natural Language Modifier Form */}
          <Card className="bg-[#111827] border-indigo-500/30">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-2 flex items-center gap-1.5">
              <Sparkles size={14} /> Modify Itinerary with AI
            </h4>
            <form onSubmit={handleNaturalModify} className="flex gap-2">
              <input
                type="text"
                value={naturalModifyText}
                onChange={(e) => setNaturalModifyText(e.target.value)}
                placeholder="e.g. 'Replace water sports on Day 3 with a relaxed cafe tour' or 'Add more local food spots'..."
                className="flex-1 px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={modifying || !naturalModifyText.trim()}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition disabled:opacity-50"
              >
                {modifying ? 'Updating...' : 'Update Itinerary'}
              </button>
            </form>
          </Card>
        </div>
      )}

      {/* TAB 2: BUDGET BREAKDOWN */}
      {activeTab === 'budget' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <span className="text-xs text-slate-400 font-medium">Total Estimated Budget</span>
              <div className="text-2xl font-bold text-white mt-1">₹{trip.totalBudget?.toLocaleString('en-IN')}</div>
              <span className="text-xs text-slate-500 block mt-1">For {trip.travelersCount} travelers</span>
            </Card>
            <Card>
              <span className="text-xs text-slate-400 font-medium">Estimated Per Person</span>
              <div className="text-2xl font-bold text-indigo-400 mt-1">₹{trip.budgetPerPerson?.toLocaleString('en-IN')}</div>
              <span className="text-xs text-slate-500 block mt-1">Average share</span>
            </Card>
            <Card>
              <span className="text-xs text-slate-400 font-medium">Style</span>
              <div className="text-2xl font-bold text-purple-400 mt-1">{trip.travelStyle}</div>
              <span className="text-xs text-slate-500 block mt-1">Comfort target</span>
            </Card>
          </div>

          <Card className="space-y-4">
            <h3 className="text-sm font-bold text-slate-200">Category Breakdown</h3>
            <div className="space-y-3">
              {[
                { name: 'Transportation (Flight / Train / Cabs)', amount: budget.transportation || 0, color: 'bg-blue-500' },
                { name: 'Accommodation (Hotels / Homestays)', amount: budget.accommodation || 0, color: 'bg-purple-500' },
                { name: 'Food & Dining (Breakfast, Lunch & Dinner)', amount: budget.food || 0, color: 'bg-emerald-500' },
                { name: 'Activities & Entry Tickets', amount: budget.activities || 0, color: 'bg-amber-500' },
                { name: 'Miscellaneous & Contingency', amount: budget.miscellaneous || 0, color: 'bg-slate-500' }
              ].map((cat, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-medium">{cat.name}</span>
                    <span className="text-white font-bold">₹{cat.amount?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full ${cat.color} rounded-full`}
                      style={{ width: `${trip.totalBudget ? Math.min(100, Math.round((cat.amount / trip.totalBudget) * 100)) : 20}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 mt-4">
              <strong>Notice:</strong> {budget.isEstimateNotice || 'Budgets are approximate estimates based on standard rates. No live bookings have been placed.'}
            </div>
          </Card>
        </div>
      )}

      {/* TAB 3: PACKING CHECKLIST */}
      {activeTab === 'packing' && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-200">AI Packing Checklist</h3>
            <span className="text-xs text-slate-400">
              {trip.packingChecklist?.filter((p) => p.checked).length} of {trip.packingChecklist?.length} packed
            </span>
          </div>

          <div className="space-y-2">
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
                {item.category && <span className="text-[10px] text-slate-500">{item.category}</span>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* TAB 4: PREPARATION CHECKLIST */}
      {activeTab === 'prep' && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-bold text-slate-200">Pre-Trip Preparation</h3>
            <span className="text-xs text-slate-400">Essential Tasks</span>
          </div>

          <div className="space-y-2">
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

      {/* Printable Report Modal */}
      {reportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto print:p-0 print:bg-white">
          <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-8 print:border-none print:shadow-none print:bg-white print:text-black">
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
                <div><strong>Duration:</strong> {trip.itinerary?.length} Days</div>
                <div><strong>Estimated Budget:</strong> ₹{trip.totalBudget?.toLocaleString('en-IN')}</div>
                <div><strong>Travelers:</strong> {trip.travelersCount} ({trip.travelStyle})</div>
              </div>

              <div>
                <h4 className="font-bold mb-2">Schedule Highlights:</h4>
                <div className="space-y-2">
                  {trip.itinerary?.map((d) => (
                    <div key={d.day} className="border-l-2 border-indigo-500 pl-3 py-1">
                      <strong>Day {d.day}: {d.title}</strong>
                      <p className="text-slate-400 print:text-gray-600 text-[11px]">{d.theme}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

