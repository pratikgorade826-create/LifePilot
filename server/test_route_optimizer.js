const routeOptimizer = require('./src/services/ai/routeOptimizer');
const tripController = require('./src/controllers/tripController');
const Trip = require('./src/models/Trip');

function mockReqRes({ user, body = {}, params = {}, query = {} } = {}) {
  const req = {
    user: user || { _id: '663e10000000000000000001', name: 'Alex Mercer' },
    body,
    params,
    query
  };
  let statusCode = 200;
  let responseData = null;
  let nextError = null;

  const res = {
    status(code) {
      statusCode = code;
      return res;
    },
    json(data) {
      responseData = data;
      return res;
    }
  };

  const next = (err) => {
    nextError = err;
  };

  return {
    req,
    res,
    next,
    getStatus: () => statusCode,
    getData: () => responseData,
    getError: () => nextError
  };
}

async function runRouteOptimizerTests() {
  console.log('========================================================');
  console.log('   SMART ROUTE OPTIMIZATION — VERIFICATION SUITE       ');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: GEOCODING & COORDINATE RESOLUTION
    // ----------------------------------------------------
    console.log('--- TEST 1: GEOCODING & COORDINATE RESOLUTION ---');
    const amerCoords = await routeOptimizer.geocodeLocation('Amer Fort', 'Jaipur');
    assert(Array.isArray(amerCoords) && amerCoords.length === 2, 'Amer Fort resolved to [lat, lon] pair');
    assert(Math.abs(amerCoords[0] - 26.9855) < 0.05, `Amer Fort latitude is verified (~26.9855): ${amerCoords[0]}`);

    const bagaCoords = await routeOptimizer.geocodeLocation('Baga Beach', 'Goa');
    assert(Math.abs(bagaCoords[0] - 15.5553) < 0.05, `Baga Beach latitude is verified (~15.5553): ${bagaCoords[0]}`);

    const qutubCoords = await routeOptimizer.geocodeLocation('Qutub Minar', 'Delhi');
    assert(Math.abs(qutubCoords[0] - 28.5244) < 0.05, `Qutub Minar latitude is verified (~28.5244): ${qutubCoords[0]}`);

    // ----------------------------------------------------
    // TEST 2: ROUTE SEGMENTS & TRAVEL DURATION CALCULATION
    // ----------------------------------------------------
    console.log('\n--- TEST 2: ROUTE SEGMENTS & DURATION CALCULATION ---');
    const cityPalaceCoords = [26.9258, 75.8237];
    const segment = await routeOptimizer.getRouteSegment(cityPalaceCoords, amerCoords);

    assert(typeof segment.distanceKm === 'number' && segment.distanceKm > 0, `Segment distance calculated: ${segment.distanceKm} km`);
    assert(typeof segment.durationMinutes === 'number' && segment.durationMinutes > 0, `Segment duration calculated: ${segment.durationMinutes} mins`);
    assert(Array.isArray(segment.geometry) && segment.geometry.length >= 2, 'Segment polyline geometry generated');
    assert(typeof segment.service === 'string', `Routing service identified: "${segment.service}"`);

    // ----------------------------------------------------
    // TEST 3: PROXIMITY CLUSTERING OF NEARBY ATTRACTIONS
    // ----------------------------------------------------
    console.log('\n--- TEST 3: ATTRACTION PROXIMITY CLUSTERING ---');
    const testAttractions = [
      { day: 1, title: 'City Palace', location: 'City Palace', coordinates: [26.9258, 75.8237] },
      { day: 1, title: 'Hawa Mahal', location: 'Hawa Mahal', coordinates: [26.9239, 75.8267] }, // ~0.4 km from City Palace
      { day: 1, title: 'Jantar Mantar', location: 'Jantar Mantar', coordinates: [26.9248, 75.8246] }, // ~0.2 km from City Palace
      { day: 2, title: 'Amer Fort', location: 'Amer', coordinates: [26.9855, 75.8513] } // ~10 km away
    ];

    const clusters = routeOptimizer.clusterNearbyAttractions(testAttractions, 3.0);
    assert(Array.isArray(clusters) && clusters.length >= 1, `Found ${clusters.length} geographic cluster(s)`);
    const oldCityCluster = clusters.find((c) => c.attractionsCount >= 3);
    assert(oldCityCluster !== undefined, 'Grouped City Palace, Hawa Mahal, and Jantar Mantar into 1 cluster');
    assert(oldCityCluster.recommendation.includes('nearby locations together'), 'Cluster includes visiting recommendation');

    // ----------------------------------------------------
    // TEST 4: MINIMIZING UNNECESSARY TRAVEL (TSP OPTIMIZATION)
    // ----------------------------------------------------
    console.log('\n--- TEST 4: SMART ROUTE MINIMIZATION (TSP REORDERING) ---');
    // Deliberately zig-zagged order: Center -> North (10km) -> Center (10km)
    const zigZagActivities = [
      { title: 'Hotel Check-in', coordinates: [26.9124, 75.7873] }, // Start
      { title: 'Amer Fort (Far North)', coordinates: [26.9855, 75.8513] }, // ~11km north
      { title: 'Hawa Mahal (Back South in City)', coordinates: [26.9239, 75.8267] }, // ~10km back south
      { title: 'Jaigarh Fort (Far North again)', coordinates: [26.9850, 75.8456] } // ~10km back north
    ];

    const currentDist = 38.5;
    const currentDur = 90;
    const optResult = routeOptimizer.computeRouteOptimization(zigZagActivities, currentDist, currentDur);

    assert(optResult.canOptimize === true, 'Optimization engine detected travel minimization opportunity');
    assert(optResult.distanceSavedKm > 0, `Engine saves ${optResult.distanceSavedKm} km of transit`);
    assert(optResult.durationSavedMins > 0, `Engine saves ${optResult.durationSavedMins} mins of transit`);
    assert(optResult.percentReduction > 0, `Transit reduced by ${optResult.percentReduction}%`);

    // ----------------------------------------------------
    // TEST 5: MULTI-DAY ITINERARY ROUTE BUILD
    // ----------------------------------------------------
    console.log('\n--- TEST 5: MULTI-DAY ROUTE BUILDING ---');
    const mockTrip = {
      _id: 'trip-multi-day-test',
      destination: 'Jaipur',
      itinerary: [
        {
          day: 1,
          title: 'Day 1: Arrival & Heritage',
          activities: [
            { title: 'Hotel Check-in', location: 'Jaipur Central' },
            { title: 'City Palace', location: 'City Palace' },
            { title: 'Hawa Mahal', location: 'Hawa Mahal' }
          ]
        },
        {
          day: 2,
          title: 'Day 2: Forts',
          activities: [
            { title: 'Amer Fort', location: 'Amer Fort' },
            { title: 'Nahargarh Fort Sunset', location: 'Nahargarh' }
          ]
        }
      ]
    };

    const tripRoutes = await routeOptimizer.buildTripRoutes(mockTrip);
    assert(tripRoutes.days.length === 2, 'Generated routes for both Day 1 and Day 2');
    assert(tripRoutes.days[0].segments.length === 2, 'Day 1 has 2 driving segments connecting 3 stops');
    assert(tripRoutes.days[1].segments.length === 1, 'Day 2 has 1 driving segment connecting 2 stops');
    assert(tripRoutes.totalTripDistanceKm > 0, `Total trip driving distance: ${tripRoutes.totalTripDistanceKm} km`);
    assert(tripRoutes.totalTripDurationMinutes > 0, `Total trip driving duration: ${tripRoutes.totalTripDurationMinutes} mins`);

    // ----------------------------------------------------
    // TEST 6: CONTROLLER GET /api/trips/:id/routes
    // ----------------------------------------------------
    console.log('\n--- TEST 6: CONTROLLER GET /api/trips/:id/routes ---');
    const createdTrip = await Trip.create({
      ownerId: '663e10000000000000000001',
      name: 'Jaipur Route Test Trip',
      startingLocation: 'New Delhi',
      destination: 'Jaipur',
      departureDate: new Date(),
      returnDate: new Date(Date.now() + 86400000 * 2),
      durationDays: 2,
      travelersCount: 2,
      totalBudget: 25000,
      itinerary: mockTrip.itinerary
    });

    const mockGetRoutes = mockReqRes({ params: { id: createdTrip._id.toString() } });
    await tripController.getTripRoutes(mockGetRoutes.req, mockGetRoutes.res, mockGetRoutes.next);
    assert(mockGetRoutes.getStatus() === 200, 'GET /:id/routes returns HTTP 200 OK');
    const routesData = mockGetRoutes.getData()?.routes;
    assert(routesData && routesData.days.length === 2, 'Controller returned multi-day route data');

    // ----------------------------------------------------
    // TEST 7: CONTROLLER POST /api/trips/:id/routes/optimize
    // ----------------------------------------------------
    console.log('\n--- TEST 7: CONTROLLER POST /api/trips/:id/routes/optimize ---');
    const mockOpt = mockReqRes({
      params: { id: createdTrip._id.toString() },
      body: {
        dayNumber: 1,
        optimizedIndices: [0, 2, 1] // Swap order
      }
    });

    await tripController.optimizeTripRoutes(mockOpt.req, mockOpt.res, mockOpt.next);
    assert(mockOpt.getStatus() === 200, 'POST /:id/routes/optimize returns HTTP 200 OK');
    const optTrip = mockOpt.getData()?.trip;
    assert(optTrip.itinerary[0].activities[1].title === 'Hawa Mahal', 'Day 1 activities reordered to optimized sequence');

    // ----------------------------------------------------
    // TEST 8: CONTROLLER PUT /api/trips/:id/activities/location
    // ----------------------------------------------------
    console.log('\n--- TEST 8: CONTROLLER PUT /api/trips/:id/activities/location ---');
    const mockMod = mockReqRes({
      params: { id: createdTrip._id.toString() },
      body: {
        dayNumber: 1,
        activityIndex: 2,
        newLocation: 'Albert Hall Museum',
        newTitle: 'Albert Hall Cultural Tour'
      }
    });

    await tripController.modifyTripLocation(mockMod.req, mockMod.res, mockMod.next);
    assert(mockMod.getStatus() === 200, 'PUT /:id/activities/location returns HTTP 200 OK');
    const modTrip = mockMod.getData()?.trip;
    assert(modTrip.itinerary[0].activities[2].location === 'Albert Hall Museum', 'Activity location modified');
    assert(modTrip.itinerary[0].activities[2].title === 'Albert Hall Cultural Tour', 'Activity title modified');

    // Clean up test trip
    await Trip.findByIdAndDelete(createdTrip._id);

    console.log('\n========================================================');
    console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED  `);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Test encountered an error:', err);
    process.exit(1);
  }
}

runRouteOptimizerTests();

