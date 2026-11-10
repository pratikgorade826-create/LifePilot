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
  CheckCircle2,
  AlertCircle,
  FileText,
  Search,
  Filter,
  X
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
  const [isSaving, setIsSaving] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [modalStep, setModalStep] = useState(1); // 1 = inputs, 2 = AI preview
  const [generatedTrip, setGeneratedTrip] = useState(null);
  const [formError, setFormError] = useState('');
  const [tripToDelete, setTripToDelete] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  // Initial dates: departure in 7 days, return in 12 days (5 days trip)
  const defaultDeparture = new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0];
  const defaultReturn = new Date(Date.now() + 86400000 * 12).toISOString().split('T')[0];

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    startingLocation: 'Mumbai',
    destination: 'Goa',
    departureDate: defaultDeparture,
    returnDate: defaultReturn,
    durationDays: 5,
    travelersCount: 2,
    totalBudget: 40000,
    travelStyle: 'Standard',
    interests: ['Beaches', 'Food', 'Relaxation'],
    additionalPreferences: ''
  });

  const availableInterests = [
    'Adventure', 'Nature', 'Beaches', 'Food', 'Culture', 'Shopping', 'Relaxation', 'Nightlife', 'Historical'
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

  // Sync departure and return dates with duration
  const handleDepartureDateChange = (val) => {
    setFormData((prev) => {
      const dep = new Date(val);
      let ret = new Date(prev.returnDate);
      if (ret <= dep) {
        ret = new Date(dep);
        ret.setDate(ret.getDate() + (prev.durationDays || 5));
      }
      const days = Math.max(1, Math.round((ret - dep) / (1000 * 60 * 60 * 24)));
      return {
        ...prev,
        departureDate: val,
        returnDate: ret.toISOString().split('T')[0],
        durationDays: days
      };
    });
  };

  const handleReturnDateChange = (val) => {
    setFormData((prev) => {
      const dep = new Date(prev.departureDate);
      const ret = new Date(val);
      const days = Math.max(1, Math.round((ret - dep) / (1000 * 60 * 60 * 24)));
      return {
        ...prev,
        returnDate: val,
        durationDays: days
      };
    });
  };

  const handleDurationChange = (days) => {
    const validDays = Math.max(1, Math.min(30, parseInt(days, 10) || 1));
    setFormData((prev) => {
      const dep = new Date(prev.departureDate);
      const ret = new Date(dep);
      ret.setDate(ret.getDate() + validDays);
      return {
        ...prev,
        durationDays: validDays,
        returnDate: ret.toISOString().split('T')[0]
      };
    });
  };

  // Step 1: AI Generation
  const handleGenerateItinerary = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formData.destination || !formData.destination.trim()) {
      setFormError('Please enter a destination.');
      return;
    }
    if (!formData.startingLocation || !formData.startingLocation.trim()) {
      setFormError('Please enter a starting location.');
      return;
    }

    setIsGenerating(true);

    try {
      const genRes = await tripsAPI.generate({
        destination: formData.destination.trim(),
        startingLocation: formData.startingLocation.trim(),
        durationDays: formData.durationDays,
        departureDate: formData.departureDate,
        returnDate: formData.returnDate,
        travelersCount: formData.travelersCount,
        totalBudget: formData.totalBudget,
        travelStyle: formData.travelStyle,
        interests: formData.interests,
        additionalPreferences: formData.additionalPreferences
      });

      const generated = genRes.data.data;
      setGeneratedTrip({
        ...generated,
        name: formData.name.trim() || generated.name || `${formData.durationDays}-Day ${formData.destination} Trip`
      });
      setModalStep(2); // Advance to preview
    } catch (err) {
      console.error('Failed to generate trip:', err);
      setFormError(err.response?.data?.message || 'Failed to generate itinerary. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Step 2: Persist in database
  const handleSaveTrip = async () => {
    if (!generatedTrip) return;
    setIsSaving(true);
    setFormError('');

    try {
      const departureDate = new Date(formData.departureDate);
      const returnDate = new Date(formData.returnDate);
      const perPerson = Math.round(formData.totalBudget / Math.max(1, formData.travelersCount));

      const saveRes = await tripsAPI.create({
        name: generatedTrip.name,
        startingLocation: formData.startingLocation,
        destination: formData.destination,
        departureDate,
        returnDate,
        durationDays: formData.durationDays,
        travelersCount: formData.travelersCount,
        totalBudget: formData.totalBudget,
        budgetPerPerson: perPerson,
        travelStyle: formData.travelStyle,
        interests: formData.interests,
        additionalPreferences: formData.additionalPreferences,
        status: 'planned',
        overview: generatedTrip.overview,
        itinerary: generatedTrip.itinerary,
        budgetBreakdown: generatedTrip.budgetBreakdown,
        packingChecklist: generatedTrip.packingChecklist,
        preparationChecklist: generatedTrip.preparationChecklist,
        feasibilityScore: generatedTrip.feasibilityScore,
        feasibilityReport: generatedTrip.feasibilityReport,
        isAiGenerated: true
      });

      setShowModal(false);
      setModalStep(1);
      setGeneratedTrip(null);
      await loadTrips();
      navigate(`/trips/${saveRes.data.trip._id}`);
    } catch (err) {
      console.error('Failed to save trip:', err);
      setFormError(err.response?.data?.message || 'Failed to save trip. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!tripToDelete) return;
    try {
      setDeletingId(tripToDelete._id);
      await tripsAPI.delete(tripToDelete._id);
      setTrips((prev) => prev.filter((t) => t._id !== tripToDelete._id));
      setTripToDelete(null);
    } catch (err) {
      console.error('Delete trip failed:', err);
    } finally {
      setDeletingId(null);
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

  const filteredTrips = trips.filter((trip) => {
    if (statusFilter !== 'ALL' && trip.status?.toLowerCase() !== statusFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = trip.name?.toLowerCase().includes(q);
      const matchDest = trip.destination?.toLowerCase().includes(q);
      const matchStart = trip.startingLocation?.toLowerCase().includes(q);
      const matchStyle = trip.travelStyle?.toLowerCase().includes(q);
      return matchName || matchDest || matchStart || matchStyle;
    }
    return true;
  });

  const perPersonCost = Math.round(formData.totalBudget / Math.max(1, formData.travelersCount));

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
            Intelligent itinerary scheduling, estimated budget breakdowns, and automated travel preparation checklists.
          </p>
        </div>

        <button
          onClick={() => {
            setModalStep(1);
            setGeneratedTrip(null);
            setFormError('');
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-xs sm:text-sm bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/20 transition self-start sm:self-auto"
        >
          <Sparkles size={16} /> Plan New Trip with AI
        </button>
      </div>

      {/* Filter & Search Bar */}
      {trips.length > 0 && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#0E131F] p-3 rounded-2xl border border-slate-800">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by destination, trip name, or city..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#0B0F19] border border-slate-700/80 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            {['ALL', 'PLANNED', 'ONGOING', 'COMPLETED'].map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition ${
                  statusFilter === status
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800/80 text-slate-400 hover:text-white'
                }`}
              >
                {status.charAt(0) + status.slice(1).toLowerCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trips Grid */}
      {filteredTrips.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => {
            const departureStr = trip.departureDate
              ? new Date(trip.departureDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'TBD';
            const returnStr = trip.returnDate
              ? new Date(trip.returnDate).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
              : 'TBD';
            const duration = trip.durationDays || trip.itinerary?.length || 5;

            return (
              <Link key={trip._id} to={`/trips/${trip._id}`} className="group block">
                <Card hover className="h-full flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Badge variant="primary">{trip.travelStyle || 'Standard'}</Badge>
                        {getStatusBadge(trip.status)}
                        {trip.feasibilityScore !== undefined && trip.feasibilityScore !== null && (
                          <Badge variant={trip.feasibilityScore >= 85 ? 'success' : trip.feasibilityScore >= 70 ? 'warning' : 'danger'}>
                            {trip.feasibilityScore}/100 Feasible
                          </Badge>
                        )}
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setTripToDelete(trip);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg transition opacity-80 group-hover:opacity-100 hover:bg-rose-500/10"
                        title="Delete trip"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-white mb-2 group-hover:text-indigo-400 transition">
                      {trip.name}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <MapPin size={14} className="text-slate-500 shrink-0" />
                      <span className="truncate">{trip.startingLocation || 'Origin'} → <strong className="text-slate-200">{trip.destination}</strong></span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-4">
                      <Calendar size={14} className="text-slate-500 shrink-0" />
                      <span>{departureStr} - {returnStr}</span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2 mb-4 leading-relaxed">
                      {trip.overview || 'AI generated personalized day-by-day travel plan.'}
                    </p>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 py-3 border-y border-slate-800">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-indigo-400" />
                        <span>{duration} Days</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Users size={14} className="text-purple-400" />
                        <span>{trip.travelersCount} Traveler{trip.travelersCount > 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1.5 col-span-2">
                        <Wallet size={14} className="text-emerald-400" />
                        <span>Total: ₹{trip.totalBudget?.toLocaleString('en-IN')} (₹{trip.budgetPerPerson?.toLocaleString('en-IN')}/person)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-2 flex items-center justify-between text-xs font-semibold text-indigo-400">
                    <span>View Full Itinerary</span>
                    <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      ) : trips.length > 0 ? (
        <div className="p-12 text-center text-slate-400 bg-[#0E131F] rounded-2xl border border-slate-800">
          <p className="text-sm">No trips match your search criteria.</p>
          <button
            onClick={() => { setSearchQuery(''); setStatusFilter('ALL'); }}
            className="text-xs text-indigo-400 hover:underline mt-2 inline-block"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <EmptyState
          icon={Plane}
          title="No Trips Scheduled"
          description="Ready to explore? Create an intelligent trip itinerary with AI-estimated budgets, day-wise schedules, and packing checklists."
          action={
            <button
              onClick={() => {
                setModalStep(1);
                setGeneratedTrip(null);
                setFormError('');
                setShowModal(true);
              }}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-2"
            >
              <Sparkles size={15} /> Plan Your First Trip
            </button>
          }
        />
      )}

      {/* AI Trip Planner Creation Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-[#111827] border border-slate-800 rounded-2xl shadow-2xl relative my-8 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-[#0E131F]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    {modalStep === 1 ? 'Plan New Trip with AI' : 'Preview AI Generated Itinerary'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {modalStep === 1 ? 'Provide parameters to generate your travel schedule' : 'Review and confirm your schedule before saving'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Error banner */}
            {formError && (
              <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* STEP 1: PARAMETERS FORM */}
            {modalStep === 1 && (
              <form onSubmit={handleGenerateItinerary} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Trip Name (optional)</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`e.g. ${formData.durationDays}-Day ${formData.destination || 'Vacation'} Adventure`}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Starting Location <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.startingLocation}
                      onChange={(e) => setFormData({ ...formData, startingLocation: e.target.value })}
                      placeholder="e.g. Mumbai, Delhi, Bengaluru"
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Destination <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.destination}
                      onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                      placeholder="e.g. Goa, Manali, Jaipur, Bali"
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Departure Date</label>
                    <input
                      type="date"
                      required
                      value={formData.departureDate}
                      onChange={(e) => handleDepartureDateChange(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Return Date</label>
                    <input
                      type="date"
                      required
                      value={formData.returnDate}
                      onChange={(e) => handleReturnDateChange(e.target.value)}
                      className="w-full px-3 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Duration (Days)</label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      required
                      value={formData.durationDays}
                      onChange={(e) => handleDurationChange(e.target.value)}
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
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
                      value={formData.travelersCount}
                      onChange={(e) => setFormData({ ...formData, travelersCount: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-medium text-slate-300">Total Budget (₹)</label>
                      <span className="text-[11px] text-indigo-400 font-medium">
                        ≈ ₹{perPersonCost.toLocaleString('en-IN')}/person
                      </span>
                    </div>
                    <input
                      type="number"
                      min="1000"
                      step="500"
                      required
                      value={formData.totalBudget}
                      onChange={(e) => setFormData({ ...formData, totalBudget: Math.max(1000, parseInt(e.target.value, 10) || 1000) })}
                      className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Travel Style</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['Budget', 'Standard', 'Luxury'].map((style) => (
                      <button
                        key={style}
                        type="button"
                        onClick={() => setFormData({ ...formData, travelStyle: style })}
                        className={`py-2 rounded-xl text-xs font-semibold border transition ${
                          formData.travelStyle === style
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm'
                            : 'bg-[#0B0F19] text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {style}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Interests (Select multiple)</label>
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
                              ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/50 shadow-sm'
                              : 'bg-[#0B0F19] text-slate-400 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          {interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Special Preferences / Constraints (optional)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.additionalPreferences}
                    onChange={(e) => setFormData({ ...formData, additionalPreferences: e.target.value })}
                    placeholder="e.g. Vegetarian food preferences, travelling with senior citizens, focus on heritage sites..."
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
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
                    {isGenerating ? 'Generating Day-wise Plan...' : 'Generate Itinerary with AI'}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: AI GENERATED PREVIEW */}
            {modalStep === 2 && generatedTrip && (
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Trip Title</label>
                  <input
                    type="text"
                    value={generatedTrip.name}
                    onChange={(e) => setGeneratedTrip({ ...generatedTrip, name: e.target.value })}
                    className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="p-3.5 rounded-xl bg-gradient-to-r from-indigo-950/40 to-violet-950/30 border border-indigo-500/20 text-xs text-slate-300 leading-relaxed">
                  {generatedTrip.overview}
                </div>

                {/* Summary badges */}
                {generatedTrip.feasibilityScore !== undefined && generatedTrip.feasibilityScore !== null && (
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 text-xs">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Sparkles size={13} className="text-indigo-400" /> AI Feasibility & Pacing Check
                    </span>
                    <Badge variant={generatedTrip.feasibilityScore >= 85 ? 'success' : 'warning'}>
                      {generatedTrip.feasibilityScore}/100 ({generatedTrip.feasibilityReport?.rating || 'Feasible'})
                    </Badge>
                  </div>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">Route</span>
                    <strong className="text-white truncate block">{formData.startingLocation} → {formData.destination}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">Duration</span>
                    <strong className="text-indigo-400 block">{formData.durationDays} Days</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">Total Budget</span>
                    <strong className="text-emerald-400 block">₹{formData.totalBudget.toLocaleString('en-IN')}</strong>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800 text-center">
                    <span className="text-slate-400 block text-[10px]">Per Person</span>
                    <strong className="text-purple-400 block">₹{perPersonCost.toLocaleString('en-IN')}</strong>
                  </div>
                </div>

                {/* Budget Breakdown Preview */}
                <div className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                    <span>Estimated Budget Breakdown</span>
                    <span className="text-indigo-400">Total: ₹{generatedTrip.budgetBreakdown?.totalEstimated?.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] text-slate-400">
                    <div>Accommodation: <strong className="text-slate-200">₹{generatedTrip.budgetBreakdown?.accommodation?.toLocaleString('en-IN')}</strong></div>
                    <div>Transit: <strong className="text-slate-200">₹{generatedTrip.budgetBreakdown?.transportation?.toLocaleString('en-IN')}</strong></div>
                    <div>Food: <strong className="text-slate-200">₹{generatedTrip.budgetBreakdown?.food?.toLocaleString('en-IN')}</strong></div>
                    <div>Activities: <strong className="text-slate-200">₹{generatedTrip.budgetBreakdown?.activities?.toLocaleString('en-IN')}</strong></div>
                    <div>Misc: <strong className="text-slate-200">₹{generatedTrip.budgetBreakdown?.miscellaneous?.toLocaleString('en-IN')}</strong></div>
                    <div>Per Person: <strong className="text-indigo-300">₹{generatedTrip.budgetBreakdown?.budgetPerPerson?.toLocaleString('en-IN')}</strong></div>
                  </div>
                </div>

                {/* Day-wise Itinerary Highlights */}
                <div>
                  <h4 className="text-xs font-bold text-slate-300 mb-2">
                    Itinerary Highlights ({generatedTrip.itinerary?.length} Days Generated)
                  </h4>
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {generatedTrip.itinerary?.map((day) => (
                      <div key={day.day} className="p-2.5 rounded-xl bg-[#0B0F19] border border-slate-800/80 text-xs">
                        <div className="flex items-center justify-between font-semibold text-slate-200 mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-5 h-5 rounded bg-indigo-500/20 text-indigo-400 text-[10px] flex items-center justify-center">D{day.day}</span>
                            {day.title}
                          </span>
                          <span className="text-[10px] text-indigo-400">{day.activities?.length || 0} activities</span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{day.theme}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Checklists Counts */}
                <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800">
                  <span>Packing list: <strong className="text-slate-200">{generatedTrip.packingChecklist?.length || 0} items</strong></span>
                  <span>Preparation tasks: <strong className="text-slate-200">{generatedTrip.preparationChecklist?.length || 0} tasks</strong></span>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setModalStep(1)}
                    className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                  >
                    ← Edit Parameters
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTrip}
                    disabled={isSaving}
                    className="px-6 py-2.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 transition flex items-center gap-2 disabled:opacity-50"
                  >
                    {isSaving ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                    {isSaving ? 'Saving Trip to Database...' : 'Save Trip to Planner'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {tripToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
              <Trash2 size={18} className="text-rose-400" /> Delete Trip?
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Are you sure you want to permanently delete <strong className="text-white">"{tripToDelete.name}"</strong>? All associated day-wise activities, checklists, and linked travel tasks will be permanently removed.
            </p>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTripToDelete(null)}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={deletingId === tripToDelete._id}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
              >
                {deletingId === tripToDelete._id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deletingId === tripToDelete._id ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
