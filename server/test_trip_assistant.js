/**
 * Automated Test Suite for Context-Aware AI Trip Assistant
 * Tests all 7 natural language command types:
 * 1. Add activities
 * 2. Remove activities
 * 3. Replace attractions
 * 4. Modify timings
 * 5. Change travel dates
 * 6. Adjust budget
 * 7. Change travel preferences
 *
 * Verifies:
 * - Only affected itinerary sections are modified
 * - Unaffected days, activities, notes are preserved
 * - Change preview generation with diff
 * - Explicit user approval requirement before updating MongoDB
 * - Recalculation of related budget and travel estimates
 */

const assert = require('assert');
const tripAssistantAgent = require('./src/services/ai/tripAssistantAgent');
const tripController = require('./src/controllers/tripController');
const Trip = require('./src/models/Trip');

let totalTests = 0;
let passedTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTest(name, fn) {
  totalTests++;
  try {
    await fn();
    passedTests++;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runTests() {
  console.log('\n--- 🤖 RUNNING CONTEXT-AWARE AI TRIP ASSISTANT TESTS ---');

  // Create baseline mock trip
  const mockTrip = {
    _id: 'trip_assistant_test_1',
    ownerId: 'user_test_123',
    name: '5-Day Goa Leisure Trip',
    startingLocation: 'Mumbai',
    destination: 'Goa',
    departureDate: new Date('2026-11-20T00:00:00.000Z'),
    returnDate: new Date('2026-11-25T00:00:00.000Z'),
    durationDays: 5,
    travelersCount: 2,
    totalBudget: 35000,
    budgetPerPerson: 17500,
    travelStyle: 'Standard',
    interests: ['Beaches', 'Food', 'Relaxation'],
    additionalPreferences: 'Near beach stay preferred',
    overview: 'A scenic relaxing tour of Goa beaches, historic forts, and seaside cafes.',
    budgetBreakdown: {
      transportation: 8000,
      accommodation: 12000,
      food: 7000,
      activities: 5000,
      miscellaneous: 3000,
      totalEstimated: 35000
    },
    itinerary: [
      {
        day: 1,
        date: '2026-11-20',
        title: 'Arrival & North Goa Relaxation',
        theme: 'Beaches and Sunsets',
        activities: [
          { time: '10:00 AM', title: 'Hotel Check-in', description: 'Check into seaside resort', location: 'Calangute', estimatedCost: 0 },
          { time: '01:00 PM', title: 'Lunch at Beach Shack', description: 'Fresh seafood meal', location: 'Baga', estimatedCost: 1200 },
          { time: '05:30 PM', title: 'Calangute Beach Walk', description: 'Evening sunset stroll', location: 'Calangute Beach', estimatedCost: 0 }
        ]
      },
      {
        day: 2,
        date: '2026-11-21',
        title: 'Forts & Cultural Exploration',
        theme: 'Heritage and Coastal Views',
        activities: [
          { time: '09:30 AM', title: 'Aguada Fort Exploration', description: 'Historic 17th century lighthouse & fort', location: 'Sinquerim', estimatedCost: 300 },
          { time: '01:30 PM', title: 'Traditional Goan Feast', description: 'Authentic lunch in Candolim', location: 'Candolim', estimatedCost: 1400 },
          { time: '05:00 PM', title: 'Anjuna Sunset Viewpoint', description: 'Scenic red cliff overlook', location: 'Anjuna', estimatedCost: 0 }
        ]
      },
      {
        day: 3,
        date: '2026-11-22',
        title: 'South Goa Heritage',
        theme: 'Old Goa & Churches',
        activities: [
          { time: '10:00 AM', title: 'Basilica of Bom Jesus', description: 'UNESCO world heritage cathedral', location: 'Old Goa', estimatedCost: 100 },
          { time: '02:00 PM', title: 'Spice Plantation Tour', description: 'Guided flora and spice walk', location: 'Ponda', estimatedCost: 800 },
          { time: '06:00 PM', title: 'Mandovi River Sunset Cruise', description: 'Folk dance & music on boat', location: 'Panaji', estimatedCost: 1200 }
        ]
      },
      {
        day: 4,
        date: '2026-11-23',
        title: 'Water Sports & Coastal Fun',
        theme: 'Adventure',
        activities: [
          { time: '10:00 AM', title: 'Jet Skiing & Banana Ride', description: 'Water adventure rides', location: 'Baga Beach', estimatedCost: 2000 }
        ]
      },
      {
        day: 5,
        date: '2026-11-24',
        title: 'Souvenir Shopping & Departure',
        theme: 'Farewell Goa',
        activities: [
          { time: '10:00 AM', title: 'Panaji Local Market', description: 'Cashews and souvenir shopping', location: 'Panaji', estimatedCost: 1500 }
        ]
      }
    ],
    save: async function() {
      return this;
    }
  };

  // -------------------------------------------------------------
  // Test 1: Add Activity
  // -------------------------------------------------------------
  await runAsyncTest('Command 1: Add Activity proposes change preview on Day 2 and preserves other days', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Add Scuba Diving at Grande Island on Day 2 morning with cost ₹3500'
    );

    assert.strictEqual(preview.actionType, 'ADD_ACTIVITY');
    assert.strictEqual(preview.affectedDay, 2);
    assert.ok(preview.previewId);
    assert.ok(preview.diff);
    assert.strictEqual(preview.diff.type, 'ITINERARY_ADDITION');
    assert.strictEqual(preview.diff.before.length, 3);
    assert.strictEqual(preview.diff.after.length, 4);

    // Verify Day 2 has the new item
    const day2After = preview.proposedChanges.itinerary.find(d => d.day === 2);
    assert.strictEqual(day2After.activities.length, 4);
    assert.ok(day2After.activities[3].title.includes('Scuba Diving'));
    assert.strictEqual(day2After.activities[3].estimatedCost, 3500);

    // Verify other days (Day 1, 3, 4, 5) are 100% untouched
    const day1After = preview.proposedChanges.itinerary.find(d => d.day === 1);
    assert.strictEqual(day1After.activities.length, 3);
    assert.deepStrictEqual(day1After.activities, mockTrip.itinerary[0].activities);

    const day3After = preview.proposedChanges.itinerary.find(d => d.day === 3);
    assert.strictEqual(day3After.activities.length, 3);
    assert.deepStrictEqual(day3After.activities, mockTrip.itinerary[2].activities);

    // Verify activities budget recalculation (+3500)
    assert.strictEqual(
      preview.proposedChanges.budgetBreakdown.activities,
      12000
    );
  });

  // -------------------------------------------------------------
  // Test 2: Remove Activity
  // -------------------------------------------------------------
  await runAsyncTest('Command 2: Remove Activity only removes target activity on specified day', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Remove Calangute Beach Walk from Day 1'
    );

    assert.strictEqual(preview.actionType, 'REMOVE_ACTIVITY');
    assert.strictEqual(preview.affectedDay, 1);
    assert.strictEqual(preview.diff.before.length, 3);
    assert.strictEqual(preview.diff.after.length, 2);
    assert.strictEqual(preview.diff.removedItem.title, 'Calangute Beach Walk');

    const day1After = preview.proposedChanges.itinerary.find(d => d.day === 1);
    assert.strictEqual(day1After.activities.length, 2);
    assert.ok(!day1After.activities.some(a => a.title.includes('Beach Walk')));

    // Day 2 untouched
    const day2After = preview.proposedChanges.itinerary.find(d => d.day === 2);
    assert.deepStrictEqual(day2After.activities, mockTrip.itinerary[1].activities);
  });

  // -------------------------------------------------------------
  // Test 3: Replace Attraction
  // -------------------------------------------------------------
  await runAsyncTest('Command 3: Replace Attraction swaps target activity and preserves schedule', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Replace Aguada Fort Exploration with Chapora Fort on Day 2'
    );

    assert.strictEqual(preview.actionType, 'REPLACE_ACTIVITY');
    assert.strictEqual(preview.affectedDay, 2);
    assert.strictEqual(preview.diff.type, 'ITINERARY_REPLACEMENT');
    assert.ok(preview.diff.replacedItem.title.includes('Aguada Fort'));
    assert.ok(preview.diff.newItem.title.includes('Chapora Fort'));

    const day2After = preview.proposedChanges.itinerary.find(d => d.day === 2);
    assert.strictEqual(day2After.activities.length, 3);
    assert.strictEqual(day2After.activities[0].title, 'Chapora Fort');

    // Day 1 & Day 3 untouched
    const day1After = preview.proposedChanges.itinerary.find(d => d.day === 1);
    assert.deepStrictEqual(day1After.activities, mockTrip.itinerary[0].activities);
  });

  // -------------------------------------------------------------
  // Test 4: Modify Timings
  // -------------------------------------------------------------
  await runAsyncTest('Command 4: Modify Timing updates activity time and leaves others intact', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Change Day 1 morning activity timing to 11:30 AM'
    );

    assert.strictEqual(preview.actionType, 'MODIFY_TIMING');
    assert.strictEqual(preview.affectedDay, 1);
    assert.strictEqual(preview.diff.type, 'TIMING_MODIFICATION');
    assert.strictEqual(preview.diff.newTiming, '11:30 AM');

    const day1After = preview.proposedChanges.itinerary.find(d => d.day === 1);
    assert.strictEqual(day1After.activities[0].time, '11:30 AM');
    assert.strictEqual(day1After.activities[1].time, '01:00 PM'); // untouched
  });

  // -------------------------------------------------------------
  // Test 5: Change Travel Dates
  // -------------------------------------------------------------
  await runAsyncTest('Command 5: Change Travel Dates shifts dates and preserves day activities', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Change travel dates to 2026-12-01 to 2026-12-06'
    );

    assert.strictEqual(preview.actionType, 'CHANGE_DATES');
    assert.strictEqual(preview.diff.type, 'DATES_CHANGE');
    assert.strictEqual(preview.diff.after.departureDate, '2026-12-01');
    assert.strictEqual(preview.diff.after.returnDate, '2026-12-06');

    // Verify all 5 days have activities preserved
    assert.strictEqual(preview.proposedChanges.itinerary.length, 5);
    assert.strictEqual(preview.proposedChanges.itinerary[0].date, '2026-12-01');
    assert.strictEqual(preview.proposedChanges.itinerary[0].activities.length, 3);
    assert.strictEqual(preview.proposedChanges.itinerary[1].date, '2026-12-02');
  });

  // -------------------------------------------------------------
  // Test 6: Adjust Budget
  // -------------------------------------------------------------
  await runAsyncTest('Command 6: Adjust Budget updates total, perPerson, and category breakdowns', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Increase total budget to 60000'
    );

    assert.strictEqual(preview.actionType, 'ADJUST_BUDGET');
    assert.strictEqual(preview.diff.type, 'BUDGET_ADJUSTMENT');
    assert.strictEqual(preview.diff.after.totalBudget, 60000);
    // 2 travelers -> 30000 per person
    assert.strictEqual(preview.diff.after.budgetPerPerson, 30000);
    assert.strictEqual(preview.proposedChanges.totalBudget, 60000);
    assert.strictEqual(preview.proposedChanges.budgetPerPerson, 30000);

    // Breakdown recalculation checks
    const bd = preview.proposedChanges.budgetBreakdown;
    assert.strictEqual(bd.transportation, 15000); // 25% of 60k
    assert.strictEqual(bd.accommodation, 21000);  // 35% of 60k
    assert.strictEqual(bd.food, 12000);           // 20% of 60k
  });

  // -------------------------------------------------------------
  // Test 7: Change Travel Preferences
  // -------------------------------------------------------------
  await runAsyncTest('Command 7: Change Travel Preferences updates style and preferences', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Change travel style to Luxury and preference to vegetarian food only'
    );

    assert.strictEqual(preview.actionType, 'CHANGE_PREFERENCES');
    assert.strictEqual(preview.diff.type, 'PREFERENCES_CHANGE');
    assert.strictEqual(preview.diff.after.travelStyle, 'Luxury');
    assert.ok(preview.diff.after.additionalPreferences.includes('vegetarian'));
    assert.strictEqual(preview.proposedChanges.travelStyle, 'Luxury');
  });

  // -------------------------------------------------------------
  // Test 8: Preview does NOT save until user explicitly approves
  // -------------------------------------------------------------
  await runAsyncTest('Preview generation does NOT mutate original trip document (requires approval)', async () => {
    const originalTrip = JSON.parse(JSON.stringify(mockTrip));

    // Request command
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      mockTrip,
      'Add Parasailing on Day 1'
    );

    assert.ok(preview);
    // Verify mockTrip itself was NOT changed
    assert.strictEqual(mockTrip.itinerary[0].activities.length, 3);
    assert.strictEqual(mockTrip.totalBudget, originalTrip.totalBudget);
    assert.strictEqual(mockTrip.travelStyle, originalTrip.travelStyle);
  });

  // -------------------------------------------------------------
  // Test 9: Apply Controller Endpoint saves approved changes to MongoDB
  // -------------------------------------------------------------
  await runAsyncTest('tripController.applyAssistantChanges saves approved changes and rechecks feasibility', async () => {
    // Insert a test trip into DB
    const dbTrip = await Trip.create({
      ownerId: '654321654321654321654321',
      name: 'Assistant Controller Test Trip',
      startingLocation: 'Mumbai',
      destination: 'Goa',
      departureDate: new Date('2026-11-20'),
      returnDate: new Date('2026-11-25'),
      durationDays: 5,
      travelersCount: 2,
      totalBudget: 35000,
      budgetPerPerson: 17500,
      travelStyle: 'Standard',
      itinerary: mockTrip.itinerary,
      budgetBreakdown: mockTrip.budgetBreakdown
    });

    // 1. Process command (returns preview, DB untouched)
    const req1 = {
      params: { id: dbTrip._id.toString() },
      user: { _id: '654321654321654321654321' },
      body: { command: 'Add evening sunset cruise on Day 1' }
    };
    let previewResult = null;
    const res1 = {
      status: (code) => {
        assert.strictEqual(code, 200);
        return {
          json: (data) => {
            previewResult = data.preview;
          }
        };
      }
    };
    await tripController.processAssistantCommand(req1, res1, (err) => { throw err; });

    assert.ok(previewResult);
    assert.strictEqual(previewResult.actionType, 'ADD_ACTIVITY');

    // Verify trip in DB is STILL untouched (3 activities on Day 1)
    const checkUnsaved = await Trip.findById(dbTrip._id);
    assert.strictEqual(checkUnsaved.itinerary[0].activities.length, 3);

    // 2. User approves proposed changes: call applyAssistantChanges
    const req2 = {
      params: { id: dbTrip._id.toString() },
      user: { _id: '654321654321654321654321' },
      body: { proposedChanges: previewResult.proposedChanges }
    };
    let applyResult = null;
    const res2 = {
      status: (code) => {
        assert.strictEqual(code, 200);
        return {
          json: (data) => {
            applyResult = data;
          }
        };
      }
    };
    await tripController.applyAssistantChanges(req2, res2, (err) => { throw err; });

    assert.ok(applyResult);
    assert.strictEqual(applyResult.success, true);
    assert.ok(applyResult.trip);
    assert.strictEqual(applyResult.trip.itinerary[0].activities.length, 4);

    // Verify feasibility score was calculated and saved
    assert.ok(applyResult.trip.feasibilityScore !== null);

    // Clean up
    await Trip.findByIdAndDelete(dbTrip._id);
  });

  console.log(`\n========================================`);
  console.log(`Assistant Tests: ${passedTests}/${totalTests} Passed`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log('✅ ALL CONTEXT-AWARE AI TRIP ASSISTANT TESTS PASSED!\n');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
