import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Navigation,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  Edit3,
  Layers,
  Compass,
  ArrowRight,
  Info,
  X,
  Loader2
} from 'lucide-react';
import { tripsAPI } from '../../services/api';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

const DAY_COLORS = [
  '#6366f1', // Day 1 - Indigo
  '#10b981', // Day 2 - Emerald
  '#f59e0b', // Day 3 - Amber
  '#a855f7', // Day 4 - Purple
  '#06b6d4', // Day 5 - Cyan
  '#ec4899', // Day 6 - Pink
  '#3b82f6'  // Day 7+ - Blue
];

export const TripRouteMap = ({ trip, onTripUpdated }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersGroupRef = useRef(null);

  const [routeData, setRouteData] = useState(null);
  const [loadingRoutes, setLoadingRoutes] = useState(true);
  const [activeDayFilter, setActiveDayFilter] = useState('ALL'); // 'ALL' or day number (1, 2, 3...)
  const [optimizing, setOptimizing] = useState(false);
  const [optimizationSuccess, setOptimizationSuccess] = useState('');

  // Modify destination state
  const [modifyingActivity, setModifyingActivity] = useState(null);
  const [newLocationInput, setNewLocationInput] = useState('');
  const [newTitleInput, setNewTitleInput] = useState('');
  const [savingLocation, setSavingLocation] = useState(false);

  useEffect(() => {
    if (trip?._id) {
      loadTripRoutes();
    }
  }, [trip?._id]);

  const loadTripRoutes = async () => {
    try {
      setLoadingRoutes(true);
      const res = await tripsAPI.getRoutes(trip._id);
      setRouteData(res.data.routes);
    } catch (err) {
      console.error('Failed to load routes:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  // Clean up Leaflet map instance on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Initialize and update Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || !routeData) return;

    // Reset container reference if previous DOM had lingering leaflet id
    if (mapContainerRef.current._leaflet_id && !mapInstanceRef.current) {
      delete mapContainerRef.current._leaflet_id;
    }

    // Initialize map instance if not already created
    if (!mapInstanceRef.current) {
      const defaultCenter = [26.9124, 75.7873];
      const map = L.map(mapContainerRef.current, {
        center: defaultCenter,
        zoom: 12,
        zoomControl: true
      });

      // OpenStreetMap standard tile layer
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19
      }).addTo(map);

      layersGroupRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    renderMapLayers();

    // Trigger resize invalidation to ensure crisp tile rendering when tabs switch
    const resizeTimer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 150);

    return () => clearTimeout(resizeTimer);
  }, [routeData, activeDayFilter]);

  const renderMapLayers = () => {
    if (!mapInstanceRef.current || !layersGroupRef.current || !routeData) return;

    const layersGroup = layersGroupRef.current;
    layersGroup.clearLayers();

    const allMarkersCoords = [];
    const daysToRender =
      activeDayFilter === 'ALL'
        ? routeData.days
        : routeData.days.filter((d) => d.day === parseInt(activeDayFilter, 10));

    daysToRender.forEach((dayRoute) => {
      const dayColor = DAY_COLORS[(dayRoute.day - 1) % DAY_COLORS.length];

      // 1. Draw activity markers
      dayRoute.activities.forEach((act, actIdx) => {
        const [lat, lon] = act.coordinates;
        allMarkersCoords.push([lat, lon]);

        // Custom styled div icon for clean modern appearance
        const customIcon = L.divIcon({
          className: 'custom-leaflet-marker',
          html: `
            <div style="
              background-color: ${dayColor};
              color: white;
              width: 32px;
              height: 32px;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 11px;
              font-weight: bold;
              border: 2px solid #0B0F19;
              box-shadow: 0 4px 12px rgba(0,0,0,0.4);
              cursor: pointer;
            ">
              D${dayRoute.day}.${actIdx + 1}
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
          popupAnchor: [0, -18]
        });

        const marker = L.marker([lat, lon], { icon: customIcon });

        // Popup content
        const popupContent = document.createElement('div');
        popupContent.className = 'p-1 text-slate-900';
        popupContent.innerHTML = `
          <div style="min-width: 180px; font-family: sans-serif;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
              <span style="font-size: 10px; font-weight: bold; background: ${dayColor}20; color: ${dayColor}; padding: 2px 6px; border-radius: 4px;">
                Day ${dayRoute.day} • Stop ${actIdx + 1}
              </span>
              <span style="font-size: 11px; color: #64748b; font-weight: 600;">${act.time}</span>
            </div>
            <strong style="font-size: 13px; color: #0f172a; display: block; margin-bottom: 2px;">${act.title}</strong>
            <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">📍 ${act.location}</div>
            ${act.estimatedCost ? `<div style="font-size: 11px; color: #059669; font-weight: bold; margin-bottom: 8px;">₹${act.estimatedCost.toLocaleString('en-IN')}</div>` : ''}
            <button id="btn-edit-act-${dayRoute.day}-${actIdx}" style="
              width: 100%;
              padding: 5px;
              font-size: 11px;
              font-weight: 600;
              background: #0f172a;
              color: white;
              border: none;
              border-radius: 6px;
              cursor: pointer;
            ">Modify Venue</button>
          </div>
        `;

        // Wire popup click event
        marker.bindPopup(popupContent);
        marker.on('popupopen', () => {
          const editBtn = document.getElementById(`btn-edit-act-${dayRoute.day}-${actIdx}`);
          if (editBtn) {
            editBtn.onclick = () => {
              setModifyingActivity({ day: dayRoute.day, activityIndex: actIdx, current: act });
              setNewLocationInput(act.location);
              setNewTitleInput(act.title);
            };
          }
        });

        layersGroup.addLayer(marker);
      });

      // 2. Draw route polylines
      dayRoute.segments.forEach((seg) => {
        if (seg.geometry && seg.geometry.length > 0) {
          const polyline = L.polyline(seg.geometry, {
            color: dayColor,
            weight: 4,
            opacity: 0.85,
            smoothFactor: 1
          });

          polyline.bindTooltip(
            `<b>Leg:</b> ${seg.fromTitle} → ${seg.toTitle}<br/><b>Distance:</b> ${seg.distanceKm} km (${seg.durationMinutes} mins)`,
            { sticky: true }
          );

          layersGroup.addLayer(polyline);
        }
      });
    });

    // Fit map bounds to encompass all active coordinates
    if (allMarkersCoords.length > 0) {
      mapInstanceRef.current.fitBounds(allMarkersCoords, {
        padding: [40, 40],
        maxZoom: 15
      });
    }
  };

  const handleApplyOptimization = async (dayNumber, optimizedIndices) => {
    try {
      setOptimizing(true);
      setOptimizationSuccess('');
      const res = await tripsAPI.optimizeRoute(trip._id, {
        dayNumber,
        optimizedIndices
      });

      setRouteData(res.data.routes);
      if (onTripUpdated) {
        onTripUpdated(res.data.trip);
      }
      setOptimizationSuccess(`Day ${dayNumber} sequence reordered to minimize travel distance!`);
      setTimeout(() => setOptimizationSuccess(''), 6000);
    } catch (err) {
      console.error('Failed to optimize route:', err);
    } finally {
      setOptimizing(false);
    }
  };

  const handleSaveLocation = async (e) => {
    e.preventDefault();
    if (!modifyingActivity) return;

    try {
      setSavingLocation(true);
      const res = await tripsAPI.modifyLocation(trip._id, {
        dayNumber: modifyingActivity.day,
        activityIndex: modifyingActivity.activityIndex,
        newLocation: newLocationInput,
        newTitle: newTitleInput
      });

      setRouteData(res.data.routes);
      if (onTripUpdated) {
        onTripUpdated(res.data.trip);
      }
      setModifyingActivity(null);
    } catch (err) {
      console.error('Failed to modify location:', err);
    } finally {
      setSavingLocation(false);
    }
  };

  if (loadingRoutes) {
    return (
      <Card className="p-12 text-center text-slate-400 space-y-3">
        <Loader2 size={24} className="animate-spin mx-auto text-indigo-400" />
        <p className="text-sm font-semibold text-white">Calculating Real Driving Routes & Geocodes...</p>
        <p className="text-xs text-slate-500">Querying OpenStreetMap and OSRM routing engine</p>
      </Card>
    );
  }

  if (!routeData) {
    return null;
  }

  // Active day route if specific day selected
  const activeDayRoute =
    activeDayFilter !== 'ALL'
      ? routeData.days.find((d) => d.day === parseInt(activeDayFilter, 10))
      : null;

  return (
    <div className="space-y-6">
      {/* Top Map Card */}
      <Card className="p-0 overflow-hidden border-slate-800 bg-[#0E131F]">
        {/* Map Header Controls */}
        <div className="p-4 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0B0F19]">
          <div className="flex items-center gap-2">
            <Compass size={18} className="text-indigo-400" />
            <div>
              <h3 className="text-sm font-bold text-white">Interactive OpenStreetMap Route Navigation</h3>
              <p className="text-[11px] text-slate-400">
                Turn-by-turn driving routes calculated with real road geometries via OSRM
              </p>
            </div>
          </div>

          {/* Day selection pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setActiveDayFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition ${
                activeDayFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              All Days ({routeData.days.length})
            </button>
            {routeData.days.map((d) => {
              const dayColor = DAY_COLORS[(d.day - 1) % DAY_COLORS.length];
              const isSelected = activeDayFilter === d.day.toString();
              return (
                <button
                  key={d.day}
                  onClick={() => setActiveDayFilter(d.day.toString())}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: dayColor }}
                  />
                  Day {d.day}
                </button>
              );
            })}
          </div>
        </div>

        {/* Leaflet Map Canvas */}
        <div className="relative">
          <div ref={mapContainerRef} className="w-full h-[460px] sm:h-[520px] bg-[#0B0F19] z-10" />

          {/* Floating Day Stats Pill */}
          <div className="absolute top-3 right-3 z-20 bg-[#0B0F19]/90 backdrop-blur-md border border-slate-800 p-2.5 rounded-xl shadow-xl text-xs flex items-center gap-3">
            <div>
              <span className="text-[10px] text-slate-400 block">Total Driving Distance</span>
              <strong className="text-white">
                {activeDayRoute ? `${activeDayRoute.dayDistanceKm} km` : `${routeData.totalTripDistanceKm} km`}
              </strong>
            </div>
            <div className="h-6 w-px bg-slate-800" />
            <div>
              <span className="text-[10px] text-slate-400 block">Est. Transit Time</span>
              <strong className="text-indigo-400">
                {activeDayRoute ? `${activeDayRoute.dayDurationMinutes} mins` : `${routeData.totalTripDurationMinutes} mins`}
              </strong>
            </div>
          </div>
        </div>
      </Card>

      {/* Optimization success alert */}
      {optimizationSuccess && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
          <span>{optimizationSuccess}</span>
        </div>
      )}

      {/* SMART ROUTE OPTIMIZATION (TSP) SECTION */}
      {routeData.days.some((d) => d.optimization?.canOptimize) && (
        <Card className="bg-gradient-to-r from-indigo-950/30 to-violet-950/20 border-indigo-500/30 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
              <Sparkles size={14} /> Smart Route Minimization Opportunities
            </h4>
            <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              TSP Algorithm
            </span>
          </div>

          <div className="space-y-3">
            {routeData.days
              .filter((d) => d.optimization?.canOptimize)
              .map((d) => {
                const opt = d.optimization;
                return (
                  <div
                    key={d.day}
                    className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2.5"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <strong className="text-xs text-white">Day {d.day}: {d.title}</strong>
                        <p className="text-[11px] text-emerald-400 mt-0.5">
                          {opt.recommendation}
                        </p>
                      </div>

                      <button
                        onClick={() => handleApplyOptimization(d.day, opt.optimizedIndices)}
                        disabled={optimizing}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
                      >
                        {optimizing ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                        {optimizing ? 'Reordering...' : 'Apply Minimized Route'}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] pt-1 border-t border-slate-800/80">
                      <div>
                        <span className="text-slate-500 block text-[10px]">Current Distance</span>
                        <strong className="text-slate-300">{opt.currentDistanceKm} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Optimized Distance</span>
                        <strong className="text-emerald-400">{opt.optimizedDistanceKm} km</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Transit Saved</span>
                        <strong className="text-indigo-300">{opt.durationSavedMins} mins less</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 block text-[10px]">Efficiency Gain</span>
                        <strong className="text-purple-300">{opt.percentReduction}% reduced</strong>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </Card>
      )}

      {/* NEARBY ATTRACTION CLUSTERS */}
      {routeData.clusters && routeData.clusters.length > 0 && (
        <Card className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers size={16} className="text-purple-400" />
                Nearby Attraction Clusters ({routeData.clusters.length})
              </h3>
              <p className="text-xs text-slate-400">
                Sights grouped within 4 km of each other to bundle into the same half-day
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {routeData.clusters.map((cluster) => (
              <div
                key={cluster.clusterId}
                className="p-3.5 rounded-xl bg-[#0B0F19] border border-slate-800 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">{cluster.name}</h4>
                  <Badge variant="violet">{cluster.attractionsCount} Attractions</Badge>
                </div>
                <div className="space-y-1 text-xs text-slate-400">
                  {cluster.attractions.map((a, i) => (
                    <div key={i} className="flex items-center gap-1.5 truncate">
                      <span className="text-purple-400 text-[10px] font-bold">D{a.day}:</span>
                      <span className="text-slate-300 truncate">{a.title}</span>
                      <span className="text-[10px] text-slate-500">({a.location})</span>
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/80">
                  {cluster.recommendation}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* STEP-BY-STEP LEGS FOR ACTIVE SELECTION */}
      <Card className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Navigation size={16} className="text-indigo-400" />
          Driving Segments & Durations ({activeDayFilter === 'ALL' ? 'All Days' : `Day ${activeDayFilter}`})
        </h3>

        <div className="space-y-3">
          {(activeDayFilter === 'ALL' ? routeData.days : [activeDayRoute]).filter(Boolean).map((d) => (
            <div key={d.day} className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pb-1 border-b border-slate-800">
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: DAY_COLORS[(d.day - 1) % DAY_COLORS.length] }}
                  />
                  Day {d.day}: {d.title}
                </span>
                <span className="text-slate-400 font-normal">
                  Total: {d.dayDistanceKm} km ({d.dayDurationMinutes} mins)
                </span>
              </div>

              {d.segments && d.segments.length > 0 ? (
                <div className="space-y-2">
                  {d.segments.map((seg, sIdx) => (
                    <div
                      key={sIdx}
                      className="p-3 rounded-xl bg-[#0B0F19] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                          {sIdx + 1}
                        </span>
                        <div className="truncate">
                          <span className="text-white font-medium">{seg.fromTitle}</span>
                          <span className="text-slate-500 mx-1.5">→</span>
                          <span className="text-white font-medium">{seg.toTitle}</span>
                          <span className="text-[10px] text-slate-500 block truncate">
                            {seg.fromLocation} to {seg.toLocation}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                        <span className="text-emerald-400 font-bold">{seg.distanceKm} km</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-indigo-400 font-semibold">{seg.durationMinutes} mins</span>
                        <span className="text-[10px] text-slate-500 px-1.5 py-0.5 rounded bg-slate-800/80">
                          {seg.isRealRoadRoute ? 'OSRM Road' : 'Geodesic'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic p-2">Single location scheduled for this day.</p>
              )}
            </div>
          ))}
        </div>

        <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-slate-400 flex items-start gap-2">
          <Info size={14} className="text-slate-400 shrink-0 mt-0.5" />
          <span>
            <strong>Routing Transparency:</strong> {routeData.disclaimer || 'Routes and driving times are calculated using the OSRM OpenStreetMap routing service. Real-time road or weather conditions may vary.'}
          </span>
        </div>
      </Card>

      {/* MODIFY VENUE / DESTINATION MODAL */}
      {modifyingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 size={16} className="text-indigo-400" /> Modify Destination Venue
              </h3>
              <button
                onClick={() => setModifyingActivity(null)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveLocation} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Activity Title</label>
                <input
                  type="text"
                  required
                  value={newTitleInput}
                  onChange={(e) => setNewTitleInput(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  New Venue / Location (e.g. Landmark, Beach, Palace)
                </label>
                <input
                  type="text"
                  required
                  value={newLocationInput}
                  onChange={(e) => setNewLocationInput(e.target.value)}
                  placeholder="e.g. Amer Fort, Hawa Mahal, Baga Beach..."
                  className="w-full px-3.5 py-2 bg-[#0B0F19] border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">
                  Updating this venue will immediately re-geocode and recalculate the driving route.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setModifyingActivity(null)}
                  className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLocation}
                  className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition flex items-center gap-1.5 disabled:opacity-50"
                >
                  {savingLocation ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                  {savingLocation ? 'Updating Route...' : 'Update & Re-Route'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

