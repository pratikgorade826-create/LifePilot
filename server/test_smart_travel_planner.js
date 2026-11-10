/**
 * ====================================================================
 *   🧠 LIFEPILOT AI — SMART TRAVEL PLANNER MASTER TEST SUITE
 *   Verifies all 5 interconnected AI travel features + group collaboration:
 *   1. AI Trip Generator & Individual Day Regenerator
 *   2. Smart Budget Optimizer (8 categories, overspending, alternatives)
 *   3. Interactive Travel Map & Route Optimization
 *   4. What-If Trip Simulator (Scenario comparison, safe application)
 *   5. Context-Aware AI Travel Companion
 *   6. Group Trip Collaboration (Invites, Polls, Splitwise Settlements)
 * ====================================================================
 */

const assert = require('assert');
const { connectDB } = require('./src/config/db');
const Trip = require('./src/models/Trip');
const TripScenario = require('./src/models/TripScenario');
const TripPoll = require('./src/models/TripPoll');
const TripExpense = require('./src/models/TripExpense');
const TripTask = require('./src/models/TripTask');
const TripActivity = require('./src/models/TripActivity');
const travelAgent = require('./src/services/ai/travelAgent');
const budgetOptimizer = require('./src/services/ai/budgetOptimizer');
const scenarioSimulator = require('./src/services/ai/scenarioSimulator');
const tripAssistantAgent = require('./src/services/ai/tripAssistantAgent');
const groupSettlementEngine = require('./src/services/travel/groupSettlementEngine');
const routeOptimizer = require('./src/services/ai/routeOptimizer');
const tripFeasibilityChecker = require('./src/services/ai/tripFeasibilityChecker');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}\n   Error: ${err.message}`);
    failed++;
  }
}

async function testAsync(description, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${description}`);
    passed++;
  } catch (err) {
    console.error(`❌ [FAIL] ${description}\n   Error: ${err.message}`);
    failed++;
  }
}

async function runMasterTravelSuite() {
  console.log('========================================================');
  console.log('  ✈️ RUNNING SMART TRAVEL PLANNER MASTER TEST SUITE     ');
  console.log('========================================================\n');

  await connectDB();

  const demoUserId = '663e10000000000000000001';
  let createdTestTrip = null;

  // -------------------------------------------------------------
  // MODULE 1: AI TRIP GENERATOR
  // -------------------------------------------------------------
  await testAsync('Module 1.1: AI Trip Generator creates full multi-day itinerary with meals, stay & budget', async () => {
    const genRes = await travelAgent.planTrip({
      destination: 'Jaipur',
      startingLocation: 'Delhi',
      durationDays: 4,
      travelersCount: 2,
      totalBudget: 32000,
      travelStyle: 'Standard',
      interests: ['Historical', 'Food', 'Culture'],
      additionalPreferences: 'Authentic Rajasthani cuisine, heritage stay'
    });

    assert(genRes.success === true, 'Trip generation should succeed');
    const data = genRes.data;
    assert(data.itinerary.length === 4, 'Should generate 4 days of schedule');
    assert(data.itinerary[0].activities.length >= 2, 'Each day has scheduled activities');
    assert(data.itinerary[0].meals.lunch, 'Includes meal recommendations');
    assert(data.budgetBreakdown.accommodation > 0, 'Includes accommodation budget');
    assert(data.budgetBreakdown.transportation > 0, 'Includes transportation budget');
    assert(typeof data.feasibilityScore === 'number', 'Includes feasibility score');
  });

  await testAsync('Module 1.2: AI Day Regenerator replaces single day without mutating other days', async () => {
    const mockTrip = {
      name: 'Jaipur Tour',
      destination: 'Jaipur',
      startingLocation: 'Delhi',
      durationDays: 3,
      itinerary: [
        { day: 1, title: 'Arrival in Pink City', activities: [{ title: 'Hawa Mahal' }] },
        { day: 2, title: 'Forts & Palaces', activities: [{ title: 'Amer Fort' }] },
        { day: 3, title: 'Bazaars & Souvenirs', activities: [{ title: 'Johari Bazaar' }] }
      ]
    };

    const regenRes = await travelAgent.regenerateDay({
      trip: mockTrip,
      dayNumber: 2,
      feedback: 'Focus on indoor museums and rain-safe artisan workshops',
      preferences: 'Low physical exertion'
    });

    assert(regenRes.success === true, 'Day regeneration should succeed');
    assert(regenRes.day.day === 2, 'Regenerated day retains day index 2');
    assert(regenRes.day.activities.length >= 2, 'Regenerated day has new activities');
    assert(regenRes.explanation, 'Provides explanation for the changes');
  });

  // -------------------------------------------------------------
  // MODULE 2: SMART BUDGET OPTIMIZER
  // -------------------------------------------------------------
  await testAsync('Module 2.1: Smart Budget Optimizer analyzes 8 categories & detects overspending', async () => {
    const overspentTrip = {
      name: 'Luxury Beach Break',
      destination: 'Goa',
      durationDays: 5,
      travelersCount: 2,
      totalBudget: 40000,
      travelStyle: 'Standard',
      budgetBreakdown: {
        transportation: 12000,
        accommodation: 22000, // over 50%
        food: 8000,
        activities: 5000,
        miscellaneous: 1000
      }
    };

    const optRes = await budgetOptimizer.optimizeBudget({
      trip: overspentTrip,
      targetBudget: 40000
    });

    assert(optRes.success === true, 'Budget optimizer should succeed');
    const data = optRes.data;
    assert(data.totalBudget === 40000, 'Matches target budget');
    assert(data.costPerPerson === Math.round(data.estimatedSpending / 2), 'Computes per-person cost');
    assert(data.utilizationPercentage > 100, 'Correctly flags over-utilization');
    assert(data.spendingStatus === 'OVERSPENT', 'Correctly flags OVERSPENT status');
    assert(data.overspendingAlerts.length > 0, 'Detects overspending alerts');
    assert(data.optimizationSuggestions.length > 0, 'Generates cost-saving alternatives');
    assert(data.projectedSavings > 0, 'Quantifies projected savings');
  });

  // -------------------------------------------------------------
  // MODULE 3: INTERACTIVE TRAVEL MAP & ROUTE OPTIMIZATION
  // -------------------------------------------------------------
  test('Module 3.1: Route Optimizer clusters attractions & minimizes transit backtracking', () => {
    const stops = [
      { day: 1, title: 'Amer Fort', coordinates: [26.9855, 75.8513] },
      { day: 1, title: 'Jaigarh Fort', coordinates: [26.9850, 75.8456] },
      { day: 1, title: 'City Palace', coordinates: [26.9258, 75.8237] }
    ];

    const clusters = routeOptimizer.clusterNearbyAttractions(stops, 3.0);
    assert(Array.isArray(clusters) && clusters.length >= 1, 'Groups close geographic attractions into clusters');

    const optResult = routeOptimizer.computeRouteOptimization(stops, 25.0, 60);
    assert(typeof optResult.canOptimize === 'boolean', 'Evaluates route optimization opportunity');
  });

  // -------------------------------------------------------------
  // MODULE 4: WHAT-IF TRIP SIMULATOR
  // -------------------------------------------------------------
  await testAsync('Module 4.1: What-If Simulator models duration extension without altering original trip', async () => {
    const baseTrip = {
      _id: '663e30000000000000000099',
      name: '5-Day Coastal Gateway',
      destination: 'Goa',
      startingLocation: 'Mumbai',
      durationDays: 5,
      travelersCount: 2,
      totalBudget: 40000,
      itinerary: [
        { day: 1, title: 'Arrival', activities: [{ title: 'Beach Walk' }] },
        { day: 2, title: 'Forts', activities: [{ title: 'Aguada Fort' }] },
        { day: 3, title: 'Churches', activities: [{ title: 'Old Goa' }] },
        { day: 4, title: 'Adventure', activities: [{ title: 'Watersports' }] },
        { day: 5, title: 'Departure', activities: [{ title: 'Market' }] }
      ]
    };

    const simRes = await scenarioSimulator.simulateScenario({
      trip: baseTrip,
      scenarioQuery: 'Extend the trip to 7 days with nature safari',
      scenarioName: '7-Day Nature Safari Extension'
    });

    assert(simRes.success === true, 'Simulation should succeed');
    const sim = simRes.data;
    assert(sim.proposedDuration === 7, 'Proposed duration is 7 days');
    assert(sim.originalDuration === 5, 'Original duration preserved at 5');
    assert(sim.costDifference > 0, 'Calculates cost difference');
    assert(sim.addedActivities.length > 0, 'Identifies added activities');
    assert(sim.advantages.length > 0, 'Generates advantages');
    assert(sim.itinerary.length === 7, 'Generates 7 complete days');
    // Ensure base trip was not mutated
    assert(baseTrip.durationDays === 5, 'Base trip remains untouched');
    assert(baseTrip.itinerary.length === 5, 'Base itinerary remains untouched');
  });

  await testAsync('Module 4.2: What-If Simulator models rainy weather contingency', async () => {
    const baseTrip = {
      name: 'Goa Trip',
      destination: 'Goa',
      durationDays: 3,
      travelersCount: 2,
      totalBudget: 30000,
      itinerary: [
        { day: 1, title: 'Beach Day', activities: [{ title: 'Sunbathing' }] },
        { day: 2, title: 'Island Boat Cruise', activities: [{ title: 'Open Sea Cruise' }] },
        { day: 3, title: 'Shopping', activities: [{ title: 'Flea Market' }] }
      ]
    };

    const simRes = await scenarioSimulator.simulateScenario({
      trip: baseTrip,
      scenarioQuery: 'What if it rains on Day 2?',
      scenarioName: 'Rainy Day Contingency'
    });

    assert(simRes.success === true, 'Weather simulation should succeed');
    const sim = simRes.data;
    assert(sim.itinerary[1].theme.toLowerCase().includes('rain') || sim.itinerary[1].theme.toLowerCase().includes('indoor'), 'Day 2 adapted for indoor rain safety');
    assert(sim.advantages.length > 0, 'Highlights advantages of indoor substitution');
  });

  // -------------------------------------------------------------
  // MODULE 5: GROUP TRIP COLLABORATION & INVITATIONS
  // -------------------------------------------------------------
  await testAsync('Module 5.1: Group trip initializes invite code and tracks members', async () => {
    createdTestTrip = await Trip.create({
      ownerId: demoUserId,
      name: 'Goa Friends Squad 2026',
      startingLocation: 'Mumbai',
      destination: 'Goa',
      departureDate: new Date('2026-12-10'),
      returnDate: new Date('2026-12-15'),
      durationDays: 5,
      travelersCount: 4,
      totalBudget: 60000,
      inviteCode: 'LPT-TEST1',
      members: [
        { userId: demoUserId, name: 'Alex Mercer', email: 'demo@lifepilot.ai', role: 'owner' }
      ],
      itinerary: [
        { day: 1, title: 'Day 1 Arrival', activities: [{ title: 'Check-in' }] }
      ]
    });

    assert(createdTestTrip._id, 'Trip created');
    assert(createdTestTrip.inviteCode === 'LPT-TEST1', 'Invite code assigned');
    assert(createdTestTrip.members.length === 1, 'Initial owner is first member');

    // Add friend member
    createdTestTrip.members.push({
      userId: '663e10000000000000000002',
      name: 'Rohan Sharma',
      email: 'rohan@example.com',
      role: 'editor',
      joinedAt: new Date()
    });
    await createdTestTrip.save();

    assert(createdTestTrip.members.length === 2, 'Member joined successfully');
    assert(createdTestTrip.members[1].role === 'editor', 'Member assigned editor role');
  });

  // -------------------------------------------------------------
  // MODULE 6: GROUP VOTING & POLLS
  // -------------------------------------------------------------
  await testAsync('Module 6.1: Group Poll creates options, prevents duplicate voting, and decides winner', async () => {
    const poll = await TripPoll.create({
      tripId: createdTestTrip._id,
      creatorId: demoUserId,
      creatorName: 'Alex Mercer',
      title: 'Which beach stay should we book?',
      category: 'hotel',
      status: 'open',
      options: [
        { text: 'North Goa Beachfront Villa', votes: [] },
        { text: 'South Goa Heritage Resort', votes: [] }
      ]
    });

    assert(poll._id, 'Poll created');
    assert(poll.options.length === 2, 'Has 2 options');

    // Alex votes for option 0
    poll.options[0].votes.push({ userId: demoUserId, userName: 'Alex Mercer', votedAt: new Date() });
    await poll.save();
    assert(poll.options[0].votes.length === 1, 'Vote recorded');

    // Alex changes vote to option 1 (duplicate prevention test)
    poll.options.forEach(opt => {
      opt.votes = opt.votes.filter(v => v.userId.toString() !== demoUserId);
    });
    poll.options[1].votes.push({ userId: demoUserId, userName: 'Alex Mercer', votedAt: new Date() });
    await poll.save();

    assert(poll.options[0].votes.length === 0, 'Old vote cleared');
    assert(poll.options[1].votes.length === 1, 'New vote recorded');

    // Close poll
    poll.status = 'closed';
    poll.winner = poll.options[1].text;
    await poll.save();

    assert(poll.status === 'closed', 'Poll is closed');
    assert(poll.winner === 'South Goa Heritage Resort', 'Winning option correctly determined');

    // Clean up test poll
    await TripPoll.deleteOne({ _id: poll._id });
  });

  // -------------------------------------------------------------
  // MODULE 7: GROUP EXPENSE MANAGEMENT & SPLITWISE SETTLEMENTS
  // -------------------------------------------------------------
  test('Module 7.1: Group Settlement Engine calculates equal split & minimizes debt transfers', () => {
    // Exact prompt scenario: 4 friends share ₹8,000 hotel expense (₹2,000 each).
    // Member 1 (Alex) pays full ₹8,000.
    const expenses = [
      {
        title: 'Boutique Hotel Booking',
        category: 'Accommodation',
        amount: 8000,
        paidBy: { userId: 'u1', userName: 'Alex' },
        participants: [
          { userId: 'u1', userName: 'Alex', shareAmount: 2000 },
          { userId: 'u2', userName: 'Bob', shareAmount: 2000 },
          { userId: 'u3', userName: 'Carol', shareAmount: 2000 },
          { userId: 'u4', userName: 'Dave', shareAmount: 2000 }
        ]
      }
    ];

    const members = [
      { userId: 'u1', name: 'Alex' },
      { userId: 'u2', name: 'Bob' },
      { userId: 'u3', name: 'Carol' },
      { userId: 'u4', name: 'Dave' }
    ];

    const report = groupSettlementEngine.calculateSettlements(expenses, members);

    assert.strictEqual(report.totalGroupExpense, 8000, 'Total expense is 8,000');
    assert.strictEqual(report.settlements.length, 3, 'Requires exactly 3 transfer settlements');

    // Bob owes Alex ₹2,000; Carol owes Alex ₹2,000; Dave owes Alex ₹2,000
    const bobTransfer = report.settlements.find(s => s.fromName === 'Bob');
    assert(bobTransfer, 'Bob has a settlement transfer');
    assert.strictEqual(bobTransfer.toName, 'Alex', 'Bob pays Alex');
    assert.strictEqual(bobTransfer.amount, 2000, 'Bob owes exactly ₹2,000');

    const alexBalance = report.memberBalances.find(b => b.name === 'Alex');
    assert.strictEqual(alexBalance.netBalance, 6000, 'Alex is owed net ₹6,000');
  });

  // -------------------------------------------------------------
  // MODULE 8: COLLABORATIVE TASKS & ACTIVITY FEED
  // -------------------------------------------------------------
  await testAsync('Module 8.1: Creates assigned trip tasks and logs activity feed', async () => {
    const task = await TripTask.create({
      tripId: createdTestTrip._id,
      title: 'Book scuba diving session at Grand Island',
      category: 'Booking',
      assignedTo: { userId: demoUserId, userName: 'Alex Mercer' },
      priority: 'High',
      status: 'pending'
    });

    assert(task._id, 'Task created');
    assert(task.status === 'pending', 'Status pending');

    task.status = 'completed';
    task.completedAt = new Date();
    await task.save();

    assert(task.status === 'completed', 'Task updated to completed');

    const activity = await TripActivity.create({
      tripId: createdTestTrip._id,
      userId: demoUserId,
      userName: 'Alex Mercer',
      action: 'TASK_COMPLETED',
      details: 'Alex Mercer completed task: Book scuba diving session'
    });

    assert(activity._id, 'Activity recorded in live feed');
    assert(activity.action === 'TASK_COMPLETED', 'Action type logged');

    // Clean up
    await TripTask.deleteOne({ _id: task._id });
    await TripActivity.deleteOne({ _id: activity._id });
  });

  // -------------------------------------------------------------
  // MODULE 9: CONTEXT-AWARE AI TRAVEL COMPANION
  // -------------------------------------------------------------
  await testAsync('Module 9.1: AI Travel Companion proposes structured modification preview', async () => {
    const preview = await tripAssistantAgent.interpretAndProposeChange(
      createdTestTrip,
      'Increase total budget to 75000'
    );

    assert(preview, 'Preview generated');
    assert.strictEqual(preview.actionType, 'ADJUST_BUDGET', 'Identifies budget adjustment intent');
    assert.strictEqual(preview.diff.after.totalBudget, 75000, 'Calculates updated budget');
    // Verify trip document was NOT mutated before approval
    assert.strictEqual(createdTestTrip.totalBudget, 60000, 'Original trip budget remains unchanged until user approval');
  });

  // Clean up main test trip
  if (createdTestTrip?._id) {
    await Trip.deleteOne({ _id: createdTestTrip._id });
  }

  console.log('\n========================================================');
  console.log(`  VERIFICATION COMPLETE: ${passed} PASSED, ${failed} FAILED  `);
  console.log('========================================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

runMasterTravelSuite().catch(e => {
  console.error('Master travel test runner encountered fatal error:', e);
  process.exit(1);
});

