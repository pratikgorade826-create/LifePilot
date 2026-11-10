/**
 * Automated Test Suite for Phase 5.1: Advanced Trip Expense Tracker
 * Tests:
 * 1. Adding an expense (validation, persistence, analytics)
 * 2. Editing an expense (recalculation of analytics)
 * 3. Deleting an expense
 * 4. Category-wise calculations (Transportation, Accommodation, Food, Activities, Misc)
 * 5. Budget utilization percentage and remaining budget
 * 6. Overspending alerts (80% threshold warning and 100%+ budget exceeded danger alert)
 * 7. Category-specific overspending detection
 * 8. MongoDB persistence across re-fetch
 * 9. Authentication and ownership protection (cross-user rejection)
 */

const assert = require('assert');
const Trip = require('./src/models/Trip');
const tripController = require('./src/controllers/tripController');

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

function mockReqRes({ user, body = {}, params = {}, query = {} } = {}) {
  const req = {
    user: user || { _id: '663e50000000000000000001' },
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

async function runTests() {
  console.log('\n--- 💰 RUNNING PHASE 5.1: TRIP EXPENSE TRACKER TESTS ---');

  const userId = '663e50000000000000000001';
  const otherUserId = '663e50000000000000000099';

  // Create baseline test trip with ₹20,000 budget
  // Budget breakdown: Transport ₹5000, Stay ₹7000, Food ₹4000, Activities ₹2500, Misc ₹1500
  const trip = await Trip.create({
    ownerId: userId,
    name: 'Goa Expense Test Trip',
    startingLocation: 'Mumbai',
    destination: 'Goa',
    departureDate: new Date('2026-11-20'),
    returnDate: new Date('2026-11-25'),
    durationDays: 5,
    travelersCount: 2,
    totalBudget: 20000,
    budgetPerPerson: 10000,
    budgetBreakdown: {
      transportation: 5000,
      accommodation: 7000,
      food: 4000,
      activities: 2500,
      miscellaneous: 1500,
      totalEstimated: 20000
    },
    actualExpenses: []
  });

  const tripId = trip._id.toString();
  let createdExpenseId = null;

  // -------------------------------------------------------------
  // Test 1: Add Expense (validation checks)
  // -------------------------------------------------------------
  await runAsyncTest('Rejects invalid category or negative amount', async () => {
    const invalidCat = mockReqRes({
      params: { id: tripId },
      body: { category: 'InvalidCategory', amount: 500, description: 'Test' }
    });
    await tripController.addExpense(invalidCat.req, invalidCat.res, invalidCat.next);
    assert.strictEqual(invalidCat.getStatus(), 400);

    const negAmount = mockReqRes({
      params: { id: tripId },
      body: { category: 'Food', amount: -100, description: 'Negative' }
    });
    await tripController.addExpense(negAmount.req, negAmount.res, negAmount.next);
    assert.strictEqual(negAmount.getStatus(), 400);
  });

  // -------------------------------------------------------------
  // Test 2: Add First Expense (Healthy spending < 80%)
  // -------------------------------------------------------------
  await runAsyncTest('Adds valid expense and computes healthy budget analytics', async () => {
    const addRes = mockReqRes({
      params: { id: tripId },
      body: {
        category: 'Food',
        amount: 2500,
        description: 'Seafood lunch at Baga Shack',
        expenseDate: '2026-11-21'
      }
    });

    await tripController.addExpense(addRes.req, addRes.res, addRes.next);
    assert.strictEqual(addRes.getStatus(), 201);
    const data = addRes.getData();
    assert.ok(data.success);
    assert.ok(data.expense);
    createdExpenseId = data.expense._id.toString();

    // Check Analytics
    const analytics = data.analytics;
    assert.strictEqual(analytics.totalActualExpenses, 2500);
    assert.strictEqual(analytics.remainingBudget, 17500);
    assert.strictEqual(analytics.budgetUtilizationPercentage, 12.5); // 2500 / 20000 = 12.5%
    assert.strictEqual(analytics.status, 'HEALTHY');
    assert.strictEqual(analytics.alerts.length, 0); // No 80% or exceeded alert

    // Check Category Breakdown
    const foodCat = analytics.categoryBreakdown.find(c => c.category === 'Food');
    assert.strictEqual(foodCat.actual, 2500);
    assert.strictEqual(foodCat.estimated, 4000);
    assert.strictEqual(foodCat.variance, -1500); // 1500 under budget
    assert.strictEqual(foodCat.isOverspent, false);
  });

  // -------------------------------------------------------------
  // Test 3: Get Expenses Endpoint
  // -------------------------------------------------------------
  await runAsyncTest('GET /api/trips/:id/expenses retrieves expense history and analytics', async () => {
    const getRes = mockReqRes({ params: { id: tripId } });
    await tripController.getExpenses(getRes.req, getRes.res, getRes.next);
    assert.strictEqual(getRes.getStatus(), 200);
    const data = getRes.getData();
    assert.ok(data.success);
    assert.strictEqual(data.expenses.length, 1);
    assert.strictEqual(data.expenses[0].description, 'Seafood lunch at Baga Shack');
  });

  // -------------------------------------------------------------
  // Test 4: Edit Expense
  // -------------------------------------------------------------
  await runAsyncTest('PUT /api/trips/:id/expenses/:expenseId updates existing expense', async () => {
    const editRes = mockReqRes({
      params: { id: tripId, expenseId: createdExpenseId },
      body: {
        category: 'Food',
        amount: 3000,
        description: 'Seafood dinner at Martin Corner (Updated)'
      }
    });

    await tripController.updateExpense(editRes.req, editRes.res, editRes.next);
    assert.strictEqual(editRes.getStatus(), 200);
    const data = editRes.getData();
    assert.strictEqual(data.expense.amount, 3000);
    assert.strictEqual(data.expense.description, 'Seafood dinner at Martin Corner (Updated)');
    assert.strictEqual(data.analytics.totalActualExpenses, 3000);
  });

  // -------------------------------------------------------------
  // Test 5: 80% Budget Warning Threshold
  // -------------------------------------------------------------
  await runAsyncTest('Triggers 80% warning alert when utilization crosses 80%', async () => {
    // Add stay expense of ₹13,500. Total spending now: 3000 + 13500 = 16,500 (82.5% of 20k)
    const addStay = mockReqRes({
      params: { id: tripId },
      body: {
        category: 'Accommodation',
        amount: 13500,
        description: 'Beach Resort 4 nights'
      }
    });

    await tripController.addExpense(addStay.req, addStay.res, addStay.next);
    assert.strictEqual(addStay.getStatus(), 201);
    const analytics = addStay.getData().analytics;

    assert.strictEqual(analytics.totalActualExpenses, 16500);
    assert.strictEqual(analytics.budgetUtilizationPercentage, 82.5);
    assert.strictEqual(analytics.status, 'WARNING_80');

    // Verify warning alert is present
    const warningAlert = analytics.alerts.find(a => a.code === 'BUDGET_WARNING_80');
    assert.ok(warningAlert, 'BUDGET_WARNING_80 alert generated');

    // Also verify Accommodation overspending alert (13500 actual vs 7000 planned)
    const stayAlert = analytics.alerts.find(a => a.code === 'OVERSPENT_ACCOMMODATION');
    assert.ok(stayAlert, 'OVERSPENT_ACCOMMODATION alert generated');
  });

  // -------------------------------------------------------------
  // Test 6: 100%+ Budget Exceeded Danger Alert
  // -------------------------------------------------------------
  await runAsyncTest('Triggers DANGER alert when total budget is exceeded (> 100%)', async () => {
    // Add flight expense of ₹6000. Total spending now: 16500 + 6000 = 22,500 (112.5% of 20k)
    const addTransport = mockReqRes({
      params: { id: tripId },
      body: {
        category: 'Transportation',
        amount: 6000,
        description: 'Flight tickets'
      }
    });

    await tripController.addExpense(addTransport.req, addTransport.res, addTransport.next);
    assert.strictEqual(addTransport.getStatus(), 201);
    const analytics = addTransport.getData().analytics;

    assert.strictEqual(analytics.totalActualExpenses, 22500);
    assert.strictEqual(analytics.remainingBudget, -2500);
    assert.strictEqual(analytics.budgetUtilizationPercentage, 112.5);
    assert.strictEqual(analytics.status, 'EXCEEDED');

    // Verify danger alert
    const dangerAlert = analytics.alerts.find(a => a.code === 'BUDGET_EXCEEDED');
    assert.ok(dangerAlert, 'BUDGET_EXCEEDED danger alert generated');
  });

  // -------------------------------------------------------------
  // Test 7: Persistence Verification across fresh database fetch
  // -------------------------------------------------------------
  await runAsyncTest('Expenses and schema changes persist in MongoDB across fresh lookup', async () => {
    const fetchedTrip = await Trip.findById(tripId);
    assert.ok(fetchedTrip);
    assert.strictEqual(fetchedTrip.actualExpenses.length, 3);
    const total = fetchedTrip.actualExpenses.reduce((s, e) => s + e.amount, 0);
    assert.strictEqual(total, 22500);
  });

  // -------------------------------------------------------------
  // Test 8: Delete Expense
  // -------------------------------------------------------------
  await runAsyncTest('DELETE /api/trips/:id/expenses/:expenseId removes expense and recalculates budget', async () => {
    const delRes = mockReqRes({
      params: { id: tripId, expenseId: createdExpenseId }
    });

    await tripController.deleteExpense(delRes.req, delRes.res, delRes.next);
    assert.strictEqual(delRes.getStatus(), 200);
    const data = delRes.getData();

    // 22500 - 3000 = 19500
    assert.strictEqual(data.analytics.totalActualExpenses, 19500);
    assert.strictEqual(data.analytics.expenseCount, 2);
  });

  // -------------------------------------------------------------
  // Test 9: Ownership & Authentication Protection
  // -------------------------------------------------------------
  await runAsyncTest('Cross-user is blocked from accessing or modifying another user expenses', async () => {
    const crossReq = mockReqRes({
      user: { _id: otherUserId },
      params: { id: tripId }
    });

    await tripController.getExpenses(crossReq.req, crossReq.res, crossReq.next);
    assert.strictEqual(crossReq.getStatus(), 404);

    const crossAdd = mockReqRes({
      user: { _id: otherUserId },
      params: { id: tripId },
      body: { category: 'Food', amount: 500, description: 'Hack' }
    });
    await tripController.addExpense(crossAdd.req, crossAdd.res, crossAdd.next);
    assert.strictEqual(crossAdd.getStatus(), 404);
  });

  // Clean up
  await Trip.findByIdAndDelete(tripId);

  console.log(`\n========================================`);
  console.log(`Expense Tracker Tests: ${passedTests}/${totalTests} Passed`);
  console.log(`========================================\n`);

  if (passedTests === totalTests) {
    console.log('✅ ALL PHASE 5.1 EXPENSE TRACKER TESTS PASSED!\n');
  } else {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

