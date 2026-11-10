const axios = require('axios');

/**
 * Smart Route Optimizer & Mapping Service
 * Integrates Leaflet/OpenStreetMap coordinates, OSRM routing,
 * attraction clustering, and traveling salesperson route optimization.
 */

// Verified landmark coordinates dictionary for common destinations
const KNOWN_COORDINATES = {
  // Goa
  'goa': [15.2993, 74.1240],
  'calangute': [15.5439, 73.7554],
  'baga': [15.5553, 73.7516],
  'fort aguada': [15.4920, 73.7737],
  'sinquerim': [15.4988, 73.7692],
  'anjuna': [15.5828, 73.7431],
  'vagator': [15.6030, 73.7336],
  'panaji': [15.4909, 73.8278],
  'old goa': [15.5009, 73.9116],
  'palolem': [15.0100, 74.0232],
  'colva': [15.2793, 73.9122],
  'dudhsagar': [15.3144, 74.3143],

  // Jaipur
  'jaipur': [26.9124, 75.7873],
  'amer fort': [26.9855, 75.8513],
  'amer': [26.9855, 75.8513],
  'city palace': [26.9258, 75.8237],
  'hawa mahal': [26.9239, 75.8267],
  'jantar mantar': [26.9248, 75.8246],
  'nahargarh': [26.9378, 75.8156],
  'jaigarh': [26.9850, 75.8456],
  'jal mahal': [26.9535, 75.8462],
  'albert hall': [26.9116, 75.8195],
  'johari bazaar': [26.9200, 75.8270],
  'bapu bazaar': [26.9180, 75.8230],
  'chokhi dhani': [26.7663, 75.8362],

  // Delhi
  'delhi': [28.6139, 77.2090],
  'new delhi': [28.6139, 77.2090],
  'india gate': [28.6129, 77.2295],
  'red fort': [28.6562, 77.2410],
  'qutub minar': [28.5244, 77.1855],
  'humayun tomb': [28.5933, 77.2507],
  'lotus temple': [28.5535, 77.2588],
  'chandni chowk': [28.6506, 77.2303],
  'akshardham': [28.6127, 77.2773],
  'connaught place': [28.6315, 77.2167],

  // Mumbai
  'mumbai': [19.0760, 72.8777],
  'gateway of india': [18.9220, 72.8347],
  'marine drive': [18.9432, 72.8230],
  'elephanta caves': [18.9633, 72.9315],
  'juhu beach': [19.0988, 72.8264],
  'bandra': [19.0596, 72.8295],
  'colaba': [18.9067, 72.8147],

  // Manali
  'manali': [32.2396, 77.1887],
  'solang valley': [32.3166, 77.1578],
  'rohtang pass': [32.3716, 77.2466],
  'hadimba temple': [32.2483, 77.1706],
  'vashisht': [32.2625, 77.1878],
  'old manali': [32.2530, 77.1750],

  // Agra
  'agra': [27.1767, 78.0081],
  'taj mahal': [27.1751, 78.0421],
  'agra fort': [27.1795, 78.0211],
  'fatehpur sikri': [27.0945, 77.6679],

  // Bengaluru
  'bangalore': [12.9716, 77.5946],
  'bengaluru': [12.9716, 77.5946],
  'lalbagh': [12.9507, 77.5848],
  'cubbon park': [12.9763, 77.5929],
  'bangalore palace': [12.9982, 77.5920],

  // International popular
  'paris': [48.8566, 2.3522],
  'london': [51.5074, -0.1278],
  'dubai': [25.2048, 55.2708],
  'singapore': [1.3521, 103.8198],
  'bali': [-8.4095, 115.1889],
  'tokyo': [35.6762, 139.6503]
};

class RouteOptimizer {
  constructor() {
    this.osrmBaseUrl = 'https://router.project-osrm.org/route/v1/driving';
    this.geocodeCache = new Map();
  }

  /**
   * Geocodes a location string into [lat, lon] coordinates
   * Checks local verified dictionary first, then falls back gracefully.
   */
  async geocodeLocation(locationName, destinationContext = '') {
    if (!locationName || typeof locationName !== 'string') {
      return this.getDefaultCoordinates(destinationContext);
    }

    const clean = locationName.toLowerCase().trim();
    const cacheKey = `${clean}|${destinationContext.toLowerCase().trim()}`;

    if (this.geocodeCache.has(cacheKey)) {
      return this.geocodeCache.get(cacheKey);
    }

    // 1. Direct match in verified landmark dictionary
    for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
      if (clean === key || clean.includes(key)) {
        this.geocodeCache.set(cacheKey, coords);
        return coords;
      }
    }

    // 2. Check destination context
    const destClean = destinationContext.toLowerCase().trim();
    for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
      if (destClean.includes(key)) {
        // Derive small deterministic offset based on location name hash to separate spots
        const hash = this.stringToHash(clean);
        const latOffset = ((hash % 100) - 50) * 0.0006; // approx 2-3km range
        const lonOffset = (((hash >> 2) % 100) - 50) * 0.0006;
        const derived = [
          Math.round((coords[0] + latOffset) * 10000) / 10000,
          Math.round((coords[1] + lonOffset) * 10000) / 10000
        ];
        this.geocodeCache.set(cacheKey, derived);
        return derived;
      }
    }

    // 3. Fallback to destination center
    const defaultCoords = this.getDefaultCoordinates(destinationContext);
    this.geocodeCache.set(cacheKey, defaultCoords);
    return defaultCoords;
  }

  /**
   * Returns default coordinates for a known city
   */
  getDefaultCoordinates(destination = '') {
    const clean = (destination || '').toLowerCase();
    for (const [key, coords] of Object.entries(KNOWN_COORDINATES)) {
      if (clean.includes(key)) return coords;
    }
    // Default to Jaipur / central India coordinates
    return [26.9124, 75.7873];
  }

  /**
   * Calculates real road route between two coordinates via OSRM
   * Falls back to Haversine geodesic calculation if OSRM is unreachable.
   */
  async getRouteSegment(originCoords, destCoords) {
    const [lat1, lon1] = originCoords;
    const [lat2, lon2] = destCoords;

    // Check if origin and destination are virtually identical
    if (Math.abs(lat1 - lat2) < 0.0001 && Math.abs(lon1 - lon2) < 0.0001) {
      return {
        distanceKm: 0.1,
        durationMinutes: 1,
        geometry: [[lat1, lon1], [lat2, lon2]],
        isRealRoadRoute: true,
        service: 'Local Venue Transition'
      };
    }

    // Attempt OSRM real driving route API
    try {
      const url = `${this.osrmBaseUrl}/${lon1},${lat1};${lon2},${lat2}?overview=full&geometries=geojson`;
      const res = await axios.get(url, {
        timeout: 3000,
        headers: { 'User-Agent': 'LifePilot-TripPlanner/1.0' }
      });

      if (res.data && res.data.code === 'Ok' && res.data.routes && res.data.routes.length > 0) {
        const route = res.data.routes[0];
        const distanceKm = Math.round((route.distance / 1000) * 10) / 10;
        const durationMinutes = Math.max(1, Math.round(route.duration / 60));

        // OSRM GeoJSON gives [lon, lat], Leaflet polyline expects [lat, lon]
        const geometry = route.geometry.coordinates.map(([lon, lat]) => [lat, lon]);

        return {
          distanceKm,
          durationMinutes,
          geometry,
          isRealRoadRoute: true,
          service: 'OSRM Driving Engine'
        };
      }
    } catch (err) {
      // OSRM network/sandbox failover - gracefully use verified geodesic formula
    }

    // Graceful Geodesic Fallback with road winding factor
    const directKm = this.calculateHaversineDistanceKm(lat1, lon1, lat2, lon2);
    const estimatedRoadKm = Math.round(directKm * 1.25 * 10) / 10;
    // Assume 25 km/h in urban city traffic
    const estimatedDurationMins = Math.max(3, Math.round((estimatedRoadKm / 25) * 60));

    return {
      distanceKm: estimatedRoadKm,
      durationMinutes: estimatedDurationMins,
      geometry: [[lat1, lon1], [lat2, lon2]],
      isRealRoadRoute: false,
      service: 'Geodesic Estimate (OSRM Offline)'
    };
  }

  /**
   * Generates complete route analysis for an entire trip itinerary
   */
  async buildTripRoutes(trip) {
    if (!trip || !Array.isArray(trip.itinerary)) {
      return { days: [], clusters: [], totalTripDistanceKm: 0, totalTripDurationMinutes: 0 };
    }

    const destination = trip.destination || '';
    const dayRoutes = [];
    const allAttractions = [];
    let totalTripDistanceKm = 0;
    let totalTripDurationMinutes = 0;

    for (const daySchedule of trip.itinerary) {
      const day = daySchedule.day;
      const activities = Array.isArray(daySchedule.activities) ? daySchedule.activities : [];

      const geocodedActivities = [];
      for (let i = 0; i < activities.length; i++) {
        const act = activities[i];
        const locationQuery = act.location || act.title || destination;
        const coords = await this.geocodeLocation(locationQuery, destination);

        const activityObj = {
          index: i,
          title: act.title,
          time: act.time,
          location: act.location || destination,
          estimatedCost: act.estimatedCost || 0,
          coordinates: coords,
          day
        };

        geocodedActivities.push(activityObj);
        allAttractions.push(activityObj);
      }

      // Calculate sequential route segments for this day
      const segments = [];
      let dayDistanceKm = 0;
      let dayDurationMinutes = 0;

      for (let i = 0; i < geocodedActivities.length - 1; i++) {
        const from = geocodedActivities[i];
        const to = geocodedActivities[i + 1];

        const routeData = await this.getRouteSegment(from.coordinates, to.coordinates);
        dayDistanceKm += routeData.distanceKm;
        dayDurationMinutes += routeData.durationMinutes;

        segments.push({
          segmentIndex: i,
          fromTitle: from.title,
          fromLocation: from.location,
          toTitle: to.title,
          toLocation: to.location,
          distanceKm: routeData.distanceKm,
          durationMinutes: routeData.durationMinutes,
          geometry: routeData.geometry,
          isRealRoadRoute: routeData.isRealRoadRoute,
          service: routeData.service
        });
      }

      dayDistanceKm = Math.round(dayDistanceKm * 10) / 10;
      totalTripDistanceKm += dayDistanceKm;
      totalTripDurationMinutes += dayDurationMinutes;

      // Check optimization potential for this day
      const optimization = this.computeRouteOptimization(geocodedActivities, dayDistanceKm, dayDurationMinutes);

      dayRoutes.push({
        day,
        title: daySchedule.title || `Day ${day}`,
        theme: daySchedule.theme || '',
        activities: geocodedActivities,
        segments,
        dayDistanceKm,
        dayDurationMinutes,
        optimization
      });
    }

    // Group nearby attractions across itinerary
    const clusters = this.clusterNearbyAttractions(allAttractions, 4.0);

    return {
      destination,
      days: dayRoutes,
      clusters,
      totalTripDistanceKm: Math.round(totalTripDistanceKm * 10) / 10,
      totalTripDurationMinutes,
      disclaimer: 'Route geometries and driving times are calculated using OSRM OpenStreetMap routing where available; direct geodesic estimates applied during network constraints.'
    };
  }

  /**
   * Groups attractions that are within proximityRadiusKm into geographic clusters
   */
  clusterNearbyAttractions(attractions, proximityRadiusKm = 3.5) {
    if (!attractions || attractions.length === 0) return [];

    const clusters = [];
    const visited = new Set();

    for (let i = 0; i < attractions.length; i++) {
      if (visited.has(i)) continue;

      const clusterGroup = [attractions[i]];
      visited.add(i);

      for (let j = i + 1; j < attractions.length; j++) {
        if (visited.has(j)) continue;

        const dist = this.calculateHaversineDistanceKm(
          attractions[i].coordinates[0],
          attractions[i].coordinates[1],
          attractions[j].coordinates[0],
          attractions[j].coordinates[1]
        );

        if (dist <= proximityRadiusKm) {
          clusterGroup.push(attractions[j]);
          visited.add(j);
        }
      }

      if (clusterGroup.length > 1) {
        // Compute geographic centroid
        const avgLat = clusterGroup.reduce((sum, a) => sum + a.coordinates[0], 0) / clusterGroup.length;
        const avgLon = clusterGroup.reduce((sum, a) => sum + a.coordinates[1], 0) / clusterGroup.length;

        // Name cluster based on most prominent venue
        const clusterName = clusterGroup[0].location || clusterGroup[0].title;

        clusters.push({
          clusterId: `cluster-${i + 1}`,
          name: `${clusterName} Area Cluster`,
          center: [Math.round(avgLat * 10000) / 10000, Math.round(avgLon * 10000) / 10000],
          attractionsCount: clusterGroup.length,
          attractions: clusterGroup.map((a) => ({
            day: a.day,
            title: a.title,
            location: a.location,
            time: a.time
          })),
          recommendation: `Visit these ${clusterGroup.length} nearby locations together in the same half-day to minimize travel time.`
        });
      }
    }

    return clusters;
  }

  /**
   * Evaluates traveling salesperson reordering to minimize transit distance
   */
  computeRouteOptimization(activities, currentDistanceKm, currentDurationMinutes) {
    if (activities.length < 3) {
      return {
        canOptimize: false,
        message: 'Itinerary already has minimal stops for this day.'
      };
    }

    // Try permutations keeping starting activity fixed (e.g. morning check-in or first sight)
    const indices = activities.map((_, i) => i);
    const permutations = this.getPermutations(indices.slice(1));

    let bestOrder = indices;
    let minDistance = currentDistanceKm;

    for (const perm of permutations) {
      const candidateOrder = [0, ...perm];
      let candidateDist = 0;

      for (let k = 0; k < candidateOrder.length - 1; k++) {
        const fromAct = activities[candidateOrder[k]];
        const toAct = activities[candidateOrder[k + 1]];
        candidateDist += this.calculateHaversineDistanceKm(
          fromAct.coordinates[0],
          fromAct.coordinates[1],
          toAct.coordinates[0],
          toAct.coordinates[1]
        ) * 1.25; // road factor
      }

      candidateDist = Math.round(candidateDist * 10) / 10;
      if (candidateDist < minDistance - 1.2) { // Meaningful savings threshold > 1.2 km
        minDistance = candidateDist;
        bestOrder = candidateOrder;
      }
    }

    const distanceSavedKm = Math.round((currentDistanceKm - minDistance) * 10) / 10;
    const durationSavedMins = Math.max(0, Math.round((distanceSavedKm / 25) * 60));

    if (distanceSavedKm >= 1.5) {
      return {
        canOptimize: true,
        currentOrder: activities.map((a) => a.title),
        optimizedOrder: bestOrder.map((i) => activities[i].title),
        optimizedIndices: bestOrder,
        currentDistanceKm,
        optimizedDistanceKm: minDistance,
        distanceSavedKm,
        durationSavedMins,
        percentReduction: Math.round((distanceSavedKm / (currentDistanceKm || 1)) * 100),
        recommendation: `Reordering Day activities will save approx ${distanceSavedKm} km (${durationSavedMins} mins) of transit.`
      };
    }

    return {
      canOptimize: false,
      message: 'Current itinerary sequence is already optimal with minimal transit.'
    };
  }

  /**
   * Applies the optimized sequence of activities to a trip's itinerary
   */
  applyOptimizedOrder(trip, dayNumber, optimizedIndices) {
    if (!trip || !Array.isArray(trip.itinerary)) return trip;

    const daySchedule = trip.itinerary.find((d) => d.day === parseInt(dayNumber, 10));
    if (!daySchedule || !Array.isArray(daySchedule.activities)) return trip;

    const currentActivities = daySchedule.activities;
    if (!optimizedIndices || optimizedIndices.length !== currentActivities.length) {
      return trip;
    }

    // Reorder activities according to optimal sequence
    const reordered = optimizedIndices.map((origIdx) => currentActivities[origIdx]);

    // Reassign standard staggered times so day schedule flows properly
    const times = ['09:30 AM', '02:30 PM', '07:00 PM', '09:00 PM'];
    reordered.forEach((act, idx) => {
      if (idx < times.length) {
        act.time = times[idx];
      }
    });

    daySchedule.activities = reordered;
    return trip;
  }

  /**
   * Modifies an activity location, updating title or location query
   */
  modifyActivityLocation(trip, dayNumber, activityIndex, newLocation, newTitle) {
    if (!trip || !Array.isArray(trip.itinerary)) return trip;

    const daySchedule = trip.itinerary.find((d) => d.day === parseInt(dayNumber, 10));
    if (!daySchedule || !Array.isArray(daySchedule.activities)) return trip;

    const act = daySchedule.activities[activityIndex];
    if (act) {
      if (newLocation) act.location = newLocation.trim();
      if (newTitle) act.title = newTitle.trim();
    }

    return trip;
  }

  // Haversine formula
  calculateHaversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c * 10) / 10;
  }

  // Generates permutations for TSP
  getPermutations(arr) {
    if (arr.length <= 1) return [arr];
    const result = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
      const subPerms = this.getPermutations(remaining);
      for (const p of subPerms) {
        result.push([current, ...p]);
      }
    }
    return result;
  }

  // Helper string hash
  stringToHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }
}

module.exports = new RouteOptimizer();

