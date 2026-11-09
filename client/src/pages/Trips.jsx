import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Plane,
  Plus,
  Calendar,
  Users,
  Wallet,
  Sparkles,
  MapPin,
  Clock,
  ArrowRight,
  Trash2,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { tripsAPI } from '../services/api';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { EmptyState } from '../components/common/EmptyState';
import { LoadingSpinner } from '../components/common/LoadingSpinner';

export const Trips = () => {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    startingLocation: 'Mumbai',
    destination: 'Goa',
    durationDays: 5,
    travelersCount: 4,
    totalBudget: 60000,
    travelStyle: 'Standard',
    interests: ['Beaches', 'Food', 'Relaxation'],
    additionalPreferences: ''
  });

  const availableInterests = [
    'Adventure', 'Nature', 'Beaches', 'Food', 'Culture', 'Shopping', 'Relaxation', 'Nightlife'
  ];

  useEffect(() => {
    loadTrips();
  }, []);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const res = await tripsAPI.getAll();
      setTrips(res.data.trips || []);
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleInterestToggle = (interest) => {
    setFormData((prev) => {
      const exists = prev.interests.includes(interest);
      if (exists) {
        return { ...prev, interests: prev.interests.filter((i) => i !== interest) };
      }
      return { ...prev, interests: [...prev.interests, interest] };
    });
  };

  const handleGenerateAndSave = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    try {
      // Step 1: AI generation
      const genRes = await tripsAPI.generate(formData);
      const generated = genRes.data.data;

      // Dates
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + 10);
      const returnDate = new Date(departureDate);
      returnDate.setDate(returnDate.getDate() + (formData.durationDays || 5));

      // Step 2: Persist in MongoDB
      const saveRes = await tripsAPI.create({
        name: formData.name || generated.name || `${formData.destination} Trip`,
        startingLocation: formData.startingLocation,
        destination: formData.destination,
        departureDate,
        returnDate,
        travelersCount: formData.travelersCount,
        totalBudget: formData.totalBudget,
        budgetPerPerson: Math.round(formData.totalBudget / formData.travelersCount),
        travelStyle: formData.travelStyle,
        interests: formData.interests,
        additionalPreferences: formData.additionalPreferences,
        overview: generated.overview,
        itinerary: generated.itinerary,
        budgetBreakdown: generated.budgetBreakdown,
        packingChecklist: generated.packingChecklist,
        preparationChecklist: generated.preparationChecklist,
        isAiGenerated: true
      });

      setShowModal(false);
      loadTrips();
      navigate(`/trips/${saveRes.data.trip._id}`);
    } catch (err) {
      console.error('Failed to generate trip:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeleteTrip = async (e, id) => {
    e.stopPropagation();
    e.preventDefault();
    if (!window.confirm('Are you sure you want to delete this trip?')) return;
    try {
      await tripsAPI.delete(id);
      setTrips((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      console.error('Delete trip failed:', err);
    }
  };

  if (loading) {
    return <LoadingSpinner label="Loading your travel itineraries..." />;
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Plane size={22} className="text-indigo-400" />
            Smart Trip Planner
          </h1>
          <p className="text-xs text-slate-400">
            Generate custom day-wise itineraries, estimated budgets, and packing lists with AI.
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 transition self-start sm:self-auto"
        >
          <Sparkles size={16} /> Plan New Trip with AI
        </button>
      </div>

      {/* Trips Grid */}
      {trips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trips.map((trip) => (
            <Link key={trip._id} to={`/trips/${trip._id}`} className="group block">
              <Card hover className="h-full flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Badge variant="primary">{trip.travelStyle} Style</Badge>
                    <button
                      onClick={(e) => handleDeleteTrip(e, trip._id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition opacity-0 group-hover:opacity-100"
                      title="Delete trip"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-400 transition">
                    {trip.name}
                  </h3>

                  <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                    <MapPin size={14} className="text-slate-500" />
                    <span>{trip.startingLocation} → {trip.destination}</span>
                  </div>

                  <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                    {trip.overview || 'AI generated personalized day-by-day travel plan.'}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 py-3 border-y border-slate-800">
                    <div className="flex items-center gap-1.5">
                      <Calendar size={14} className="text-indigo-400" />
                      <span>{trip.itinerary?.length || 5} Days</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={14} className="text-purple-400" />
                      <span>{trip.travelersCount} Travelers</span>
                    </div>
                    <div className="flex items-center gap-1.5 col-span-2">
                      <Wallet size={14} className="text-emerald-400" />
                      <span>Total: ₹{trip.totalBudget?.toLocaleString('en-IN')} (₹{trip.budgetPerPerson?.toLocaleString('en-IN')}/p)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold text-indigo-400">
                  <span>View Itinerary</span>
                  <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={Plane}
          title="No Trips Scheduled"
          description="Ready to explore? Create an intelligent trip itinerary with AI budget breakdowns and checklists."
          action={
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition"
            >
              Plan Your First Trip
            </button>
          }
        />
      )}

      {/* AI Trip Planner Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-xl bg-[#111827] border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl relative my-8">
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Create AI Trip Plan</h3>
                  <p className="text-xs text-slate-400">Provide trip parameters to orchestrate itinerary</p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleGenerateAndSave} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Trip Name (optional)</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Goa Monsoon Getaway"
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Starting Location</label>
                  <input
                    type="text"
                    required
                    value={formData.startingLocation}
                    onChange={(e) => setFormData({ ...formData, startingLocation: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Destination</label>
                  <input
                    type="text"
                    required
                    value={formData.destination}
                    onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Days)</label>
                  <input
                    type="number"
                    min="1"
                    max="30"
                    required
                    value={formData.durationDays}
                    onChange={(e) => setFormData({ ...formData, durationDays: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Travelers</label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.travelersCount}
                    onChange={(e) => setFormData({ ...formData, travelersCount: parseInt(e.target.value, 10) || 1 })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Total Budget (₹)</label>
                  <input
                    type="number"
                    min="1000"
                    required
                    value={formData.totalBudget}
                    onChange={(e) => setFormData({ ...formData, totalBudget: parseInt(e.target.value, 10) || 10000 })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Travel Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {['Budget', 'Standard', 'Luxury'].map((style) => (
                    <button
                      key={style}
                      type="button"
                      onClick={() => setFormData({ ...formData, travelStyle: style })}
                      className={`py-2 rounded-xl text-xs font-semibold border transition ${
                        formData.travelStyle === style
                          ? 'bg-indigo-600 text-white border-indigo-500'
                          : 'bg-[#0B0F19] text-slate-400 border-slate-800 hover:text-white'
                      }`}
                    >
                      {style}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Interests</label>
                <div className="flex flex-wrap gap-2">
                  {availableInterests.map((interest) => {
                    const isSelected = formData.interests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => handleInterestToggle(interest)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                            : 'bg-[#0B0F19] text-slate-400 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGenerating}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 transition flex items-center gap-2 disabled:opacity-50"
                >
                  {isGenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {isGenerating ? 'Generating Itinerary...' : 'Generate Trip'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

