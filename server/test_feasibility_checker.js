const tripController = require('./src/controllers/tripController');
const tripFeasibilityChecker = require('./src/services/ai/tripFeasibilityChecker');
const travelAgent = require('./src/services/ai/travelAgent');
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

async function runFeasibilityTests() {
  console.log('========================================================');
  console.log('    AI TRIP FEASIBILITY CHECKER — VERIFICATION SUITE    ');
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
    // TEST 1: ANALYSIS OF A BALANCED ITINERARY
    // ----------------------------------------------------
    console.log('--- TEST 1: BALANCED ITINERARY EVALUATION ---');
    const balancedTrip = {
      _id: 'test-trip-balanced-1',
      destination: 'Goa',
      startingLocation: 'Mumbai',
      durationDays: 3,
      travelersCount: 2,
      totalBudget: 40000,
      travelStyle: 'Standard',
      interests: ['Beaches', 'Food'],
      itinerary: [
        {
          day: 1,
          title: 'Arrival & North Goa Beaches',
          activities: [
            { time: '10:00 AM', title: 'Check-in & Unpack', location: 'Calangute', estimatedCost: 0 },
            { time: '03:00 PM', title: 'Calangute Beach Walk', location: 'Calangute', estimatedCost: 500 },
            { time: '07:30 PM', title: 'Goan Coastal Dinner', location: 'Baga', estimatedCost: 1500 }
          ]
        },
        {
          day: 2,
          title: 'Heritage Forts & Water Sports',
          activities: [
            { time: '10:00 AM', title: 'Fort Aguada Visit', location: 'Sinquerim', estimatedCost: 400 },
            { time: '02:30 PM', title: 'Water Sports Experience', location: 'Calangute Beach', estimatedCost: 2500 },
            { time: '07:00 PM', title: 'Anjuna Night Market Walk', location: 'Anjuna', estimatedCost: 800 }
          ]
        }
      ],
      budgetBreakdown: {
        transportation: 10000,
        accommodation: 14000,
        food: 8000,
        activities: 5000,
        miscellaneous: 3000,
        totalEstimated: 40000
      }
    };

    const balancedReport = tripFeasibilityChecker.checkTripFeasibility(balancedTrip);
    assert(balancedReport.overallScore >= 80, `Balanced trip has high feasibility score: ${balancedReport.overallScore}/100`);
    assert(balancedReport.rating.includes('Feasible'), `Rating is positive: "${balancedReport.rating}"`);
    assert(balancedReport.metrics.pacingScore >= 80, 'Pacing score is healthy (>=80)');
    assert(balancedReport.metrics.transitFeasibility >= 75, 'Transit feasibility is healthy (>=75)');
    assert(balancedReport.disclaimer.includes('verified approximations'), 'Disclaimer is present');

    // ----------------------------------------------------
    // TEST 2: DETECTION OF SCHEDULING CONFLICTS (CLOSING HOURS)
    // ----------------------------------------------------
    console.log('\n--- TEST 2: DETECTION OF ATTRACTION OPENING HOURS CONFLICTS ---');
    const conflictTrip = {
      _id: 'test-trip-conflict-1',
      destination: 'Jaipur',
      startingLocation: 'Delhi',
      durationDays: 2,
      travelersCount: 2,
      totalBudget: 25000,
      travelStyle: 'Standard',
      itinerary: [
        {
          day: 1,
          title: 'Jaipur Palaces & Evening Heritage',
          activities: [
            { time: '11:00 AM', title: 'City Palace Tour', location: 'Old City', estimatedCost: 600 },
            // Evening conflict: Fort scheduled at 8:30 PM when gates close at 5:30 PM
            { time: '08:30 PM', title: 'Amer Fort & Palace Exploration', location: 'Amer', estimatedCost: 1000 }
          ]
        }
      ],
      budgetBreakdown: { totalEstimated: 25000, activities: 3500 }
    };

    const conflictReport = tripFeasibilityChecker.checkTripFeasibility(conflictTrip);
    const hasClosingIssue = conflictReport.issues.some((i) => i.type === 'SCHEDULING_CONFLICT');
    assert(hasClosingIssue, 'Detected SCHEDULING_CONFLICT for Amer Fort scheduled at 08:30 PM');
    const closingIssue = conflictReport.issues.find((i) => i.type === 'SCHEDULING_CONFLICT');
    assert(closingIssue.severity === 'high', 'Closing conflict has HIGH priority');
    assert(closingIssue.recommendation.includes('morning') || closingIssue.recommendation.includes('afternoon'), 'Recommendation suggests daytime slot');

    // ----------------------------------------------------
    // TEST 3: DETECTION OF INSUFFICIENT TRAVEL BUFFER
    // ----------------------------------------------------
    console.log('\n--- TEST 3: DETECTION OF INSUFFICIENT TRAVEL BUFFERS ---');
    const tightTransitTrip = {
      _id: 'test-trip-transit-1',
      destination: 'Goa',
      startingLocation: 'Mumbai',
      durationDays: 1,
      travelersCount: 1,
      totalBudget: 15000,
      travelStyle: 'Standard',
      itinerary: [
        {
          day: 1,
          title: 'Cross-Coast Rapid Run',
          activities: [
            // North Goa location, ends ~11:30 AM
            { time: '10:00 AM', title: 'Baga Beach Watersports', location: 'North Goa - Baga', estimatedCost: 1500 },
            // South Goa location 45 km away, scheduled at 11:45 AM (only 15 mins gap for 1h+ travel!)
            { time: '11:45 AM', title: 'Palolem Beach Heritage Walk', location: 'South Goa - Palolem', estimatedCost: 500 }
          ]
        }
      ],
      budgetBreakdown: { totalEstimated: 15000, activities: 2000 }
    };

    const transitReport = tripFeasibilityChecker.checkTripFeasibility(tightTransitTrip);
    const hasTransitIssue = transitReport.issues.some((i) => i.type === 'INSUFFICIENT_TRAVEL_TIME');
    assert(hasTransitIssue, 'Detected INSUFFICIENT_TRAVEL_TIME for North Goa to South Goa transition');
    const transitIssue = transitReport.issues.find((i) => i.type === 'INSUFFICIENT_TRAVEL_TIME');
    assert(transitIssue.recommendation.includes('buffer'), 'Recommendation suggests adding travel buffer');

    // ----------------------------------------------------
    // TEST 4: DETECTION OF EXCESSIVE ACTIVITIES & UNREALISTIC SCHEDULE
    // ----------------------------------------------------
    console.log('\n--- TEST 4: DETECTION OF EXCESSIVE ACTIVITIES & PACING OVERLOAD ---');
    const overpackedTrip = {
      _id: 'test-trip-packed-1',
      destination: 'Delhi',
      startingLocation: 'Jaipur',
      durationDays: 1,
      travelersCount: 1,
      totalBudget: 15000,
      travelStyle: 'Standard',
      itinerary: [
        {
          day: 1,
          title: 'Marathon Sightseeing Day',
          activities: [
            { time: '08:00 AM', title: 'Qutub Minar Complex', location: 'Mehrauli', estimatedCost: 500 },
            { time: '10:30 AM', title: 'Humayun Tomb Tour', location: 'Nizamuddin', estimatedCost: 500 },
            { time: '01:30 PM', title: 'National Museum Visit', location: 'Janpath', estimatedCost: 400 },
            { time: '04:00 PM', title: 'Red Fort Exploration', location: 'Old Delhi', estimatedCost: 600 },
            { time: '07:30 PM', title: 'Chandni Chowk Food Tour', location: 'Old Delhi', estimatedCost: 1200 }
          ]
        }
      ],
      budgetBreakdown: { totalEstimated: 15000, activities: 2500 }
    };

    const overpackedReport = tripFeasibilityChecker.checkTripFeasibility(overpackedTrip);
    const hasExcessiveIssue = overpackedReport.issues.some((i) => i.type === 'EXCESSIVE_ACTIVITIES');
    const hasUnrealisticIssue = overpackedReport.issues.some((i) => i.type === 'UNREALISTIC_SCHEDULE');
    assert(hasExcessiveIssue, 'Detected EXCESSIVE_ACTIVITIES (5 activities scheduled in single day)');
    assert(hasUnrealisticIssue, 'Detected UNREALISTIC_SCHEDULE (> 10.5 active hours estimated)');

    // ----------------------------------------------------
    // TEST 5: DETECTION OF BUDGET OVERRUN RISK
    // ----------------------------------------------------
    console.log('\n--- TEST 5: DETECTION OF BUDGET OVERRUN RISK ---');
    const overrunTrip = {
      _id: 'test-trip-overrun-1',
      destination: 'Udaipur',
      startingLocation: 'Ahmedabad',
      durationDays: 3,
      travelersCount: 2,
      totalBudget: 20000,
      travelStyle: 'Luxury', // Luxury style with only ₹20,000 for 3 days = ₹3,333/day per person
      itinerary: [
        {
          day: 1,
          activities: [
            // Activity costs total ₹9,000, far exceeding typical activity budget of ₹2,400
            { time: '10:00 AM', title: 'Private Royal Boat Charter', location: 'Lake Pichola', estimatedCost: 5500 },
            { time: '03:00 PM', title: 'Exclusive Heritage Museum Entry', location: 'City Palace', estimatedCost: 3500 }
          ]
        }
      ],
      budgetBreakdown: {
        totalEstimated: 20000,
        activities: 2400
      }
    };

    const overrunReport = tripFeasibilityChecker.checkTripFeasibility(overrunTrip);
    const hasBudgetIssue = overrunReport.issues.some((i) => i.type === 'BUDGET_OVERRUN');
    assert(hasBudgetIssue, 'Detected BUDGET_OVERRUN for activity ticket costs exceeding allocated budget');

    // ----------------------------------------------------
    // TEST 6: APPLYING FEASIBILITY IMPROVEMENTS & REGENERATION
    // ----------------------------------------------------
    console.log('\n--- TEST 6: APPLYING FEASIBILITY IMPROVEMENTS & AUTO-FIX ---');
    const tripToFix = {
      destination: 'Jaipur',
      startingLocation: 'Delhi',
      durationDays: 1,
      travelersCount: 2,
      totalBudget: 25000,
      travelStyle: 'Standard',
      itinerary: [
        {
          day: 1,
          title: 'Jaipur Highlights',
          activities: [
            // Misplaced evening fort
            { time: '08:30 PM', title: 'Amer Fort Exploration', location: 'Amer', estimatedCost: 1000 },
            // Misplaced night market in morning
            { time: '10:00 AM', title: 'Night Market Bazaar Walk', location: 'Johari Bazaar', estimatedCost: 500 }
          ]
        }
      ],
      budgetBreakdown: {
        transportation: 6000,
        accommodation: 9000,
        food: 5000,
        activities: 1200,
        miscellaneous: 3800,
        totalEstimated: 25000
      }
    };

    const initialReport = tripFeasibilityChecker.checkTripFeasibility(tripToFix);
    const initialIssuesCount = initialReport.issues.length;
    assert(initialIssuesCount >= 2, `Initial trip has ${initialIssuesCount} detected issues`);

    // Apply auto-fix improvements
    const improved = tripFeasibilityChecker.applyFeasibilityImprovements(tripToFix, { issueId: 'ALL' });
    const fixedActivities = improved.itinerary[0].activities;

    // Verify Amer Fort moved out of late night
    const amerFort = fixedActivities.find((a) => a.title.includes('Amer Fort'));
    assert(amerFort.time === '10:00 AM', `Amer Fort rescheduled to daylight hours (${amerFort.time})`);

    // Verify night market moved to evening
    const nightMarket = fixedActivities.find((a) => a.title.includes('Night Market'));
    assert(nightMarket.time === '07:00 PM', `Night Market rescheduled to evening hours (${nightMarket.time})`);

    // Re-check feasibility of improved trip
    const afterReport = tripFeasibilityChecker.checkTripFeasibility({ ...tripToFix, ...improved });
    assert(afterReport.overallScore > initialReport.overallScore, `Overall feasibility score improved from ${initialReport.overallScore} to ${afterReport.overallScore}`);
    assert(afterReport.issues.length < initialIssuesCount, `Issue count reduced from ${initialIssuesCount} to ${afterReport.issues.length}`);

    // ----------------------------------------------------
    // TEST 7: CONTROLLER ENDPOINT POST /api/trips/:id/feasibility
    // ----------------------------------------------------
    console.log('\n--- TEST 7: CONTROLLER POST /api/trips/:id/feasibility ---');
    // Create a real trip document
    const createdTrip = await Trip.create({
      ownerId: '663e10000000000000000001',
      name: 'Jaipur Feasibility Test Trip',
      startingLocation: 'New Delhi',
      destination: 'Jaipur',
      departureDate: new Date(),
      returnDate: new Date(Date.now() + 86400000 * 3),
      durationDays: 3,
      travelersCount: 2,
      totalBudget: 30000,
      budgetPerPerson: 15000,
      travelStyle: 'Standard',
      itinerary: balancedTrip.itinerary,
      budgetBreakdown: balancedTrip.budgetBreakdown
    });

    const mockCheck = mockReqRes({ params: { id: createdTrip._id.toString() } });
    await tripController.checkFeasibility(mockCheck.req, mockCheck.res, mockCheck.next);
    assert(mockCheck.getStatus() === 200, 'POST /:id/feasibility returns HTTP 200');
    assert(mockCheck.getData()?.feasibilityReport?.overallScore >= 75, 'Returned feasibility report has valid overallScore');
    assert(mockCheck.getData()?.trip.feasibilityScore !== null, 'feasibilityScore persisted on trip document');

    // ----------------------------------------------------
    // TEST 8: CONTROLLER ENDPOINT POST /api/trips/:id/feasibility/apply
    // ----------------------------------------------------
    console.log('\n--- TEST 8: CONTROLLER POST /api/trips/:id/feasibility/apply ---');
    const mockApply = mockReqRes({
      params: { id: createdTrip._id.toString() },
      body: { issueId: 'ALL' }
    });

    await tripController.applyFeasibilityFix(mockApply.req, mockApply.res, mockApply.next);
    assert(mockApply.getStatus() === 200, 'POST /:id/feasibility/apply returns HTTP 200');
    assert(mockApply.getData()?.success === true, 'Fix returned success: true');
    assert(mockApply.getData()?.feasibilityReport !== undefined, 'Updated feasibility report returned');

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

runFeasibilityTests();

