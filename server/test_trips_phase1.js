const tripController = require('./src/controllers/tripController');
const travelAgent = require('./src/services/ai/travelAgent');
const Trip = require('./src/models/Trip');
const Task = require('./src/models/Task');

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

async function runPhase1Tests() {
  console.log('========================================================');
  console.log('     SMART TRIP PLANNER — PHASE 1 VERIFICATION SUITE    ');
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
    // TEST 1: AI ITINERARY GENERATION VIA TRAVEL AGENT
    // ----------------------------------------------------
    console.log('--- TEST 1: AI ITINERARY GENERATION & VALIDATION ---');
    const agentPlan = await travelAgent.planTrip({
      destination: 'Jaipur, Rajasthan',
      startingLocation: 'New Delhi',
      durationDays: 4,
      travelersCount: 2,
      totalBudget: 35000,
      travelStyle: 'Standard',
      interests: ['Culture', 'Historical', 'Food'],
      additionalPreferences: 'Focus on royal palaces and authentic Rajasthani thali'
    });

    assert(agentPlan.success === true, 'travelAgent.planTrip returned success: true');
    const plan = agentPlan.data;
    assert(plan.destination === 'Jaipur, Rajasthan', 'Destination matches request');
    assert(plan.durationDays === 4, 'Duration matches requested 4 days');
    assert(Array.isArray(plan.itinerary) && plan.itinerary.length === 4, 'Itinerary has exactly 4 scheduled days');

    // ----------------------------------------------------
    // TEST 2: DAY-WISE ACTIVITY SCHEDULING
    // ----------------------------------------------------
    console.log('\n--- TEST 2: DAY-WISE ACTIVITY SCHEDULING ---');
    plan.itinerary.forEach((day, idx) => {
      const dNum = idx + 1;
      assert(day.day === dNum, `Day ${dNum} has correct day index`);
      assert(typeof day.title === 'string' && day.title.length > 0, `Day ${dNum} has descriptive title: "${day.title}"`);
      assert(Array.isArray(day.activities) && day.activities.length === 3, `Day ${dNum} has 3 activities (Morning, Afternoon, Evening)`);
      assert(day.activities[0].time && day.activities[0].title, `Day ${dNum} activity 1 has time (${day.activities[0].time}) & title`);
      assert(day.meals && day.meals.breakfast && day.meals.lunch && day.meals.dinner, `Day ${dNum} has breakfast, lunch & dinner recommendations`);
      assert(typeof day.stay === 'string' && day.stay.length > 0, `Day ${dNum} has accommodation recommendation`);
    });

    // ----------------------------------------------------
    // TEST 3: ESTIMATED BUDGET & PER-PERSON CALCULATION
    // ----------------------------------------------------
    console.log('\n--- TEST 3: ESTIMATED BUDGET & PER-PERSON CALCULATION ---');
    const budget = plan.budgetBreakdown;
    assert(budget && typeof budget === 'object', 'Budget breakdown exists');
    assert(budget.transportation > 0, `Transportation cost calculated: ₹${budget.transportation}`);
    assert(budget.accommodation > 0, `Accommodation cost calculated: ₹${budget.accommodation}`);
    assert(budget.food > 0, `Food & dining cost calculated: ₹${budget.food}`);
    assert(budget.activities > 0, `Activities cost calculated: ₹${budget.activities}`);
    assert(typeof budget.miscellaneous === 'number', `Miscellaneous cost calculated: ₹${budget.miscellaneous}`);

    const sumCategories = budget.transportation + budget.accommodation + budget.food + budget.activities + budget.miscellaneous;
    assert(sumCategories === budget.totalEstimated, `Sum of categories (₹${sumCategories}) exactly equals totalEstimated (₹${budget.totalEstimated})`);
    assert(budget.totalEstimated === 35000, 'Total estimated matches requested total budget ₹35,000');
    assert(budget.budgetPerPerson === 17500, 'Per-person budget is exactly ₹17,500 (₹35,000 / 2)');
    assert(budget.isEstimateNotice && budget.isEstimateNotice.includes('approximations'), 'Estimate disclaimer notice is present');

    // ----------------------------------------------------
    // TEST 4: TRAVEL CHECKLISTS
    // ----------------------------------------------------
    console.log('\n--- TEST 4: PACKING & PREPARATION CHECKLISTS ---');
    assert(Array.isArray(plan.packingChecklist) && plan.packingChecklist.length >= 5, `Packing checklist generated with ${plan.packingChecklist.length} categorized items`);
    assert(Array.isArray(plan.preparationChecklist) && plan.preparationChecklist.length >= 4, `Preparation checklist generated with ${plan.preparationChecklist.length} actionable tasks`);

    // ----------------------------------------------------
    // TEST 5: CONTROLLER POST /generate
    // ----------------------------------------------------
    console.log('\n--- TEST 5: CONTROLLER POST /api/trips/generate ---');
    const mockGen = mockReqRes({
      body: {
        destination: 'Manali, Himachal Pradesh',
        startingLocation: 'Chandigarh',
        durationDays: 3,
        travelersCount: 2,
        totalBudget: 24000,
        travelStyle: 'Budget',
        interests: ['Mountains', 'Adventure']
      }
    });

    await tripController.generate(mockGen.req, mockGen.res, mockGen.next);
    assert(mockGen.getStatus() === 200, 'generate returns HTTP 200');
    const genData = mockGen.getData();
    assert(genData.success === true, 'generate returned success: true');
    assert(genData.data.destination === 'Manali, Himachal Pradesh', 'Controller returned destination');
    assert(genData.data.durationDays === 3, 'Controller returned 3 days');
    assert(genData.data.budgetBreakdown.budgetPerPerson === 12000, 'Per person budget is ₹12,000 (₹24,000 / 2)');

    // ----------------------------------------------------
    // TEST 6: SAVE TRIP FUNCTIONALITY (POST /api/trips)
    // ----------------------------------------------------
    console.log('\n--- TEST 6: SAVE TRIP FUNCTIONALITY & PERSISTENCE ---');
    const departureDate = new Date(Date.now() + 86400000 * 10).toISOString();
    const returnDate = new Date(Date.now() + 86400000 * 14).toISOString();

    const mockCreate = mockReqRes({
      body: {
        name: '4-Day Royal Jaipur Holiday',
        startingLocation: 'New Delhi',
        destination: 'Jaipur, Rajasthan',
        departureDate,
        returnDate,
        durationDays: 4,
        travelersCount: 2,
        totalBudget: 35000,
        travelStyle: 'Standard',
        interests: ['Culture', 'Historical', 'Food'],
        overview: plan.overview,
        itinerary: plan.itinerary,
        budgetBreakdown: plan.budgetBreakdown,
        packingChecklist: plan.packingChecklist,
        preparationChecklist: plan.preparationChecklist
      }
    });

    await tripController.create(mockCreate.req, mockCreate.res, mockCreate.next);
    assert(mockCreate.getStatus() === 201, 'create returns HTTP 201 Created');
    const createdTrip = mockCreate.getData()?.trip;
    assert(createdTrip && createdTrip._id, `Trip persisted with ID: ${createdTrip?._id}`);
    assert(createdTrip.name === '4-Day Royal Jaipur Holiday', 'Persisted trip has correct name');
    assert(createdTrip.budgetPerPerson === 17500, 'Persisted trip has calculated budgetPerPerson ₹17,500');
    assert(createdTrip.status === 'planned', 'Persisted status defaults to "planned"');
    assert(createdTrip.ownerId.toString() === '663e10000000000000000001', 'Trip ownership verified with authenticated user');

    // ----------------------------------------------------
    // TEST 7: GET TRIPS LIST & SINGLE TRIP
    // ----------------------------------------------------
    console.log('\n--- TEST 7: GET ALL TRIPS & GET SINGLE TRIP ---');
    const mockGetAll = mockReqRes();
    await tripController.getAll(mockGetAll.req, mockGetAll.res, mockGetAll.next);
    assert(mockGetAll.getStatus() === 200, 'getAll returns HTTP 200');
    const allTrips = mockGetAll.getData()?.trips;
    assert(Array.isArray(allTrips) && allTrips.length >= 1, `getAll returned ${allTrips?.length} trips`);
    const foundTrip = allTrips.find(t => t._id.toString() === createdTrip._id.toString());
    assert(foundTrip !== undefined, 'Created trip found in trips list');

    const mockGetOne = mockReqRes({ params: { id: createdTrip._id.toString() } });
    await tripController.getOne(mockGetOne.req, mockGetOne.res, mockGetOne.next);
    assert(mockGetOne.getStatus() === 200, 'getOne returns HTTP 200');
    assert(mockGetOne.getData()?.trip?.name === '4-Day Royal Jaipur Holiday', 'getOne retrieved matching trip name');

    // ----------------------------------------------------
    // TEST 8: EDIT TRIP FUNCTIONALITY (PUT /api/trips/:id)
    // ----------------------------------------------------
    console.log('\n--- TEST 8: EDIT TRIP FUNCTIONALITY ---');
    const mockUpdate = mockReqRes({
      params: { id: createdTrip._id.toString() },
      body: {
        name: '4-Day Luxury Heritage Jaipur Tour',
        travelersCount: 3,
        totalBudget: 45000,
        travelStyle: 'Luxury',
        status: 'ongoing'
      }
    });

    await tripController.update(mockUpdate.req, mockUpdate.res, mockUpdate.next);
    assert(mockUpdate.getStatus() === 200, 'update returns HTTP 200');
    const updatedTrip = mockUpdate.getData()?.trip;
    assert(updatedTrip.name === '4-Day Luxury Heritage Jaipur Tour', 'Trip name updated');
    assert(updatedTrip.travelStyle === 'Luxury', 'Travel style updated to "Luxury"');
    assert(updatedTrip.status === 'ongoing', 'Status updated to "ongoing"');
    assert(updatedTrip.travelersCount === 3, 'Travelers count updated to 3');
    assert(updatedTrip.totalBudget === 45000, 'Total budget updated to ₹45,000');
    assert(updatedTrip.budgetPerPerson === 15000, 'budgetPerPerson automatically recalculated to ₹15,000 (₹45,000 / 3)');

    // ----------------------------------------------------
    // TEST 9: CHECKLIST INTERACTION
    // ----------------------------------------------------
    console.log('\n--- TEST 9: CHECKLIST INTERACTION PERSISTENCE ---');
    const updatedPacking = [...createdTrip.packingChecklist];
    updatedPacking[0].checked = true;

    const mockToggle = mockReqRes({
      params: { id: createdTrip._id.toString() },
      body: { packingChecklist: updatedPacking }
    });

    await tripController.update(mockToggle.req, mockToggle.res, mockToggle.next);
    assert(mockToggle.getStatus() === 200, 'update checklist returns HTTP 200');
    const toggledTrip = mockToggle.getData()?.trip;
    assert(toggledTrip.packingChecklist[0].checked === true, 'First packing item successfully marked as checked');

    // ----------------------------------------------------
    // TEST 10: GET TRIP REPORT (PRINTABLE)
    // ----------------------------------------------------
    console.log('\n--- TEST 10: GET TRIP REPORT ---');
    const mockReport = mockReqRes({ params: { id: createdTrip._id.toString() } });
    await tripController.getReport(mockReport.req, mockReport.res, mockReport.next);
    assert(mockReport.getStatus() === 200, 'getReport returns HTTP 200');
    const report = mockReport.getData()?.report;
    assert(report.title === '4-Day Luxury Heritage Jaipur Tour', 'Report contains updated trip title');
    assert(report.destination === 'Jaipur, Rajasthan', 'Report contains destination');
    assert(report.budgetBreakdown !== undefined, 'Report contains budget breakdown');
    assert(report.packingChecklist !== undefined, 'Report contains packing list');

    // ----------------------------------------------------
    // TEST 11: DELETE TRIP FUNCTIONALITY
    // ----------------------------------------------------
    console.log('\n--- TEST 11: DELETE TRIP FUNCTIONALITY ---');
    // First create a dummy task linked to this trip
    await Task.create({
      ownerId: '663e10000000000000000001',
      title: 'Prepare Jaipur Heritage pass',
      originType: 'TRIP',
      originId: createdTrip._id.toString(),
      originModel: 'Trip'
    });

    const mockDelete = mockReqRes({ params: { id: createdTrip._id.toString() } });
    await tripController.delete(mockDelete.req, mockDelete.res, mockDelete.next);
    assert(mockDelete.getStatus() === 200, 'delete returns HTTP 200');
    assert(mockDelete.getData()?.success === true, 'delete returned success: true');

    // Verify trip is deleted
    const mockCheckDeleted = mockReqRes({ params: { id: createdTrip._id.toString() } });
    await tripController.getOne(mockCheckDeleted.req, mockCheckDeleted.res, mockCheckDeleted.next);
    assert(mockCheckDeleted.getStatus() === 404, 'Subsequent getOne returns HTTP 404 Not Found');

    // Verify linked task was cleaned up
    const remainingTasks = await Task.find({ originId: createdTrip._id.toString() });
    assert(remainingTasks.length === 0, 'Linked trip tasks were cleaned up successfully without orphans');

    console.log('\n========================================================');
    console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED  `);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('\n❌ Test encountered an error:', err);
    process.exit(1);
  }
}

runPhase1Tests();
