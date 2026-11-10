const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Task = require('../models/Task');
const travelAgent = require('../services/ai/travelAgent');
const Notification = require('../models/Notification');
const tripFeasibilityChecker = require('../services/ai/tripFeasibilityChecker');
const routeOptimizer = require('../services/ai/routeOptimizer');
const tripAssistantAgent = require('../services/ai/tripAssistantAgent');

exports.generate = async (req, res, next) => {
  try {
    const {
      destination,
      startingLocation,
      durationDays,
      departureDate,
      returnDate,
      travelersCount,
      totalBudget,
      travelStyle,
      interests,
      additionalPreferences,
      prompt
    } = req.body;

    if (!destination || !destination.trim()) {
      return res.status(400).json({ success: false, message: 'Destination is required.' });
    }

    const result = await travelAgent.planTrip({
      destination: destination.trim(),
      startingLocation: (startingLocation && startingLocation.trim()) || 'Mumbai',
      durationDays: parseInt(durationDays, 10) || 5,
      departureDate,
      returnDate,
      travelersCount: Math.max(1, parseInt(travelersCount, 10) || 1),
      totalBudget: Math.max(1000, parseInt(totalBudget, 10) || 30000),
      travelStyle: travelStyle || 'Standard',
      interests: Array.isArray(interests) && interests.length ? interests : ['Beaches', 'Food'],
      additionalPreferences: additionalPreferences || '',
      prompt
    });

    res.status(200).json({
      success: true,
      data: result.data,
      isDemoOutput: result.isDemoOutput,
      provider: result.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.create = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const body = { ...req.body };

    const destination = body.destination && body.destination.trim();
    if (!destination) {
      return res.status(400).json({ success: false, message: 'Destination is required.' });
    }

    const startingLocation = (body.startingLocation && body.startingLocation.trim()) || 'Current City';
    const durationDays = Math.max(1, parseInt(body.durationDays, 10) || 5);
    const travelersCount = Math.max(1, parseInt(body.travelersCount, 10) || 1);
    const totalBudget = Math.max(1000, parseInt(body.totalBudget, 10) || 30000);
    const budgetPerPerson = Math.round(totalBudget / travelersCount);

    // Compute dates if not explicitly provided
    let departureDate = body.departureDate ? new Date(body.departureDate) : null;
    if (!departureDate || isNaN(departureDate.getTime())) {
      departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + 7);
    }

    let returnDate = body.returnDate ? new Date(body.returnDate) : null;
    if (!returnDate || isNaN(returnDate.getTime())) {
      returnDate = new Date(departureDate);
      returnDate.setDate(returnDate.getDate() + durationDays);
    }

    const name = (body.name && body.name.trim()) || `${durationDays}-Day ${destination} Trip`;

    const tripData = {
      ...body,
      ownerId: userId,
      name,
      startingLocation,
      destination,
      departureDate,
      returnDate,
      durationDays,
      travelersCount,
      totalBudget,
      budgetPerPerson,
      travelStyle: body.travelStyle || 'Standard',
      interests: Array.isArray(body.interests) ? body.interests : ['Beaches', 'Food'],
      status: body.status || 'planned',
      overview: body.overview || '',
      itinerary: Array.isArray(body.itinerary) ? body.itinerary : [],
      budgetBreakdown: body.budgetBreakdown || {
        transportation: Math.round(totalBudget * 0.25),
        accommodation: Math.round(totalBudget * 0.35),
        food: Math.round(totalBudget * 0.20),
        activities: Math.round(totalBudget * 0.12),
        miscellaneous: totalBudget - Math.round(totalBudget * 0.92),
        totalEstimated: totalBudget,
        budgetPerPerson,
        isEstimateNotice: 'All figures are reasonable market approximations for planning purposes; real-time booking prices vary.'
      },
      packingChecklist: Array.isArray(body.packingChecklist) ? body.packingChecklist : [],
      preparationChecklist: Array.isArray(body.preparationChecklist) ? body.preparationChecklist : [],
      isAiGenerated: body.isAiGenerated !== undefined ? body.isAiGenerated : true
    };

    // Calculate feasibility report if not already attached
    if (!tripData.feasibilityReport && tripData.itinerary.length > 0) {
      const report = tripFeasibilityChecker.checkTripFeasibility(tripData);
      tripData.feasibilityScore = report.overallScore;
      tripData.feasibilityReport = report;
    }

    const trip = await Trip.create(tripData);

    // Notify user
    try {
      await Notification.create({
        ownerId: userId,
        title: 'New Trip Added',
        message: `Your trip to ${trip.destination} ("${trip.name}") has been saved.`,
        type: 'TRAVEL',
        link: `/trips/${trip._id}`
      });
    } catch (notifErr) {
      console.warn('[TripController] Notification creation skipped:', notifErr.message);
    }

    res.status(201).json({ success: true, trip });
  } catch (error) {
    next(error);
  }
};

exports.getAll = async (req, res, next) => {
  try {
    const query = { ownerId: req.user._id };

    if (req.query.status && ['draft', 'planned', 'ongoing', 'completed', 'cancelled'].includes(req.query.status)) {
      query.status = req.query.status;
    }

    const trips = await Trip.find(query).sort({ departureDate: 1 });
    res.status(200).json({ success: true, count: trips.length, trips });
  } catch (error) {
    next(error);
  }
};

exports.getOne = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }
    res.status(200).json({ success: true, trip });
  } catch (error) {
    next(error);
  }
};

exports.update = async (req, res, next) => {
  try {
    const updateData = { ...req.body };
    delete updateData.ownerId; // Prevent changing ownership

    const existingTrip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!existingTrip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    // Recalculate budgetPerPerson if totalBudget or travelersCount updated
    if (updateData.totalBudget !== undefined || updateData.travelersCount !== undefined) {
      if (updateData.travelersCount !== undefined) {
        updateData.travelersCount = Math.max(1, parseInt(updateData.travelersCount, 10) || 1);
      }
      if (updateData.totalBudget !== undefined) {
        updateData.totalBudget = Math.max(0, parseInt(updateData.totalBudget, 10) || 0);
      }
      const budget = updateData.totalBudget !== undefined ? updateData.totalBudget : existingTrip.totalBudget;
      const travelers = updateData.travelersCount !== undefined ? updateData.travelersCount : existingTrip.travelersCount;
      updateData.budgetPerPerson = Math.round(budget / Math.max(1, travelers));
    }

    // Recalculate durationDays if dates updated
    if (updateData.departureDate && updateData.returnDate) {
      const d1 = new Date(updateData.departureDate);
      const d2 = new Date(updateData.returnDate);
      if (!isNaN(d1.getTime()) && !isNaN(d2.getTime())) {
        const diffDays = Math.max(1, Math.round((d2 - d1) / (1000 * 60 * 60 * 24)));
        updateData.durationDays = diffDays;
      }
    }

    const trip = await Trip.findOneAndUpdate(
      { _id: req.params.id, ownerId: req.user._id },
      updateData,
      { new: true, runValidators: true }
    );

    res.status(200).json({ success: true, message: 'Trip updated successfully.', trip });
  } catch (error) {
    next(error);
  }
};

exports.delete = async (req, res, next) => {
  try {
    const trip = await Trip.findOneAndDelete({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    // Clean up associated tasks so they are not orphaned
    try {
      await Task.deleteMany({
        ownerId: req.user._id,
        originType: 'TRIP',
        originId: req.params.id
      });
    } catch (taskErr) {
      console.warn('[TripController] Could not clean up linked tasks:', taskErr.message);
    }

    res.status(200).json({ success: true, message: 'Trip deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getReport = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const departureStr = trip.departureDate ? new Date(trip.departureDate).toLocaleDateString() : 'TBD';
    const returnStr = trip.returnDate ? new Date(trip.returnDate).toLocaleDateString() : 'TBD';

    const printableReport = {
      title: trip.name,
      destination: trip.destination,
      startingLocation: trip.startingLocation,
      dates: `${departureStr} to ${returnStr}`,
      duration: `${trip.itinerary?.length || 5} Days`,
      travelers: trip.travelersCount,
      travelStyle: trip.travelStyle,
      estimatedBudget: `₹${trip.totalBudget?.toLocaleString('en-IN')}`,
      budgetPerPerson: `₹${trip.budgetPerPerson?.toLocaleString('en-IN')}`,
      budgetBreakdown: trip.budgetBreakdown,
      itinerarySummary: trip.itinerary,
      packingChecklist: trip.packingChecklist,
      preparationChecklist: trip.preparationChecklist,
      generatedAt: new Date().toISOString()
    };

    res.status(200).json({ success: true, report: printableReport });
  } catch (error) {
    next(error);
  }
};

exports.checkFeasibility = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const report = tripFeasibilityChecker.checkTripFeasibility(trip);

    // Persist feasibility on trip
    trip.feasibilityScore = report.overallScore;
    trip.feasibilityReport = report;
    await trip.save();

    res.status(200).json({
      success: true,
      feasibilityReport: report,
      trip
    });
  } catch (error) {
    next(error);
  }
};

exports.applyFeasibilityFix = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    // Apply auto-improvements based on requested issue or ALL
    const improvements = tripFeasibilityChecker.applyFeasibilityImprovements(trip, req.body || {});

    trip.itinerary = improvements.itinerary;
    trip.budgetBreakdown = improvements.budgetBreakdown;

    // Re-evaluate feasibility after applying fixes
    const updatedReport = tripFeasibilityChecker.checkTripFeasibility(trip);
    trip.feasibilityScore = updatedReport.overallScore;
    trip.feasibilityReport = updatedReport;
    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Itinerary schedule and buffers optimized and regenerated successfully.',
      trip,
      feasibilityReport: updatedReport
    });
  } catch (error) {
    next(error);
  }
};

exports.getTripRoutes = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const routeData = await routeOptimizer.buildTripRoutes(trip);

    res.status(200).json({
      success: true,
      routes: routeData,
      trip
    });
  } catch (error) {
    next(error);
  }
};

exports.optimizeTripRoutes = async (req, res, next) => {
  try {
    const { dayNumber, optimizedIndices } = req.body;
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (!dayNumber || !Array.isArray(optimizedIndices)) {
      return res.status(400).json({ success: false, message: 'dayNumber and optimizedIndices are required.' });
    }

    routeOptimizer.applyOptimizedOrder(trip, dayNumber, optimizedIndices);

    // Re-check feasibility on optimized sequence
    const updatedReport = tripFeasibilityChecker.checkTripFeasibility(trip);
    trip.feasibilityScore = updatedReport.overallScore;
    trip.feasibilityReport = updatedReport;
    await trip.save();

    // Re-calculate updated route data
    const updatedRoutes = await routeOptimizer.buildTripRoutes(trip);

    res.status(200).json({
      success: true,
      message: `Day ${dayNumber} itinerary route optimized to minimize travel distance.`,
      trip,
      routes: updatedRoutes
    });
  } catch (error) {
    next(error);
  }
};

exports.modifyTripLocation = async (req, res, next) => {
  try {
    const { dayNumber, activityIndex, newLocation, newTitle } = req.body;
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (dayNumber === undefined || activityIndex === undefined || (!newLocation && !newTitle)) {
      return res.status(400).json({ success: false, message: 'dayNumber, activityIndex, and newLocation or newTitle are required.' });
    }

    routeOptimizer.modifyActivityLocation(trip, dayNumber, activityIndex, newLocation, newTitle);

    // Re-evaluate feasibility
    const updatedReport = tripFeasibilityChecker.checkTripFeasibility(trip);
    trip.feasibilityScore = updatedReport.overallScore;
    trip.feasibilityReport = updatedReport;
    await trip.save();

    const updatedRoutes = await routeOptimizer.buildTripRoutes(trip);

    res.status(200).json({
      success: true,
      message: 'Activity location updated successfully.',
      trip,
      routes: updatedRoutes
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Context-Aware Assistant: interpret natural language command and return change preview
 * (Does NOT modify database - requires explicit user approval)
 */
exports.processAssistantCommand = async (req, res, next) => {
  try {
    const { command } = req.body;
    if (!command || !command.trim()) {
      return res.status(400).json({ success: false, message: 'Natural language command is required.' });
    }

    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const preview = await tripAssistantAgent.interpretAndProposeChange(trip, command.trim());

    res.status(200).json({
      success: true,
      preview
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Context-Aware Assistant: apply approved changes to MongoDB
 */
exports.applyAssistantChanges = async (req, res, next) => {
  try {
    const { proposedChanges } = req.body;
    if (!proposedChanges || typeof proposedChanges !== 'object') {
      return res.status(400).json({ success: false, message: 'Proposed changes payload is required.' });
    }

    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    // Apply allowed itinerary and metadata modifications
    if (Array.isArray(proposedChanges.itinerary)) {
      trip.itinerary = proposedChanges.itinerary;
    }
    if (proposedChanges.budgetBreakdown && typeof proposedChanges.budgetBreakdown === 'object') {
      trip.budgetBreakdown = proposedChanges.budgetBreakdown;
    }
    if (proposedChanges.totalBudget !== undefined) {
      trip.totalBudget = Math.max(1000, parseInt(proposedChanges.totalBudget, 10) || trip.totalBudget);
      trip.budgetPerPerson = Math.round(trip.totalBudget / (trip.travelersCount || 1));
    }
    if (proposedChanges.budgetPerPerson !== undefined) {
      trip.budgetPerPerson = proposedChanges.budgetPerPerson;
    }
    if (proposedChanges.departureDate) {
      trip.departureDate = new Date(proposedChanges.departureDate);
    }
    if (proposedChanges.returnDate) {
      trip.returnDate = new Date(proposedChanges.returnDate);
    }
    if (proposedChanges.durationDays) {
      trip.durationDays = proposedChanges.durationDays;
    }
    if (proposedChanges.travelStyle) {
      trip.travelStyle = proposedChanges.travelStyle;
    }
    if (Array.isArray(proposedChanges.interests)) {
      trip.interests = proposedChanges.interests;
    }
    if (proposedChanges.additionalPreferences !== undefined) {
      trip.additionalPreferences = proposedChanges.additionalPreferences;
    }
    if (proposedChanges.overview) {
      trip.overview = proposedChanges.overview;
    }

    // Recalculate feasibility after changes
    const updatedFeasibility = tripFeasibilityChecker.checkTripFeasibility(trip);
    trip.feasibilityScore = updatedFeasibility.overallScore;
    trip.feasibilityReport = updatedFeasibility;

    await trip.save();

    res.status(200).json({
      success: true,
      message: 'Proposed changes approved and applied successfully.',
      trip
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper: Compute comprehensive budget analytics and overspending alerts
 */
function computeBudgetAnalytics(trip) {
  const originalEstimatedBudget = Number(trip.totalBudget) || 0;
  const expenses = Array.isArray(trip.actualExpenses) ? trip.actualExpenses : [];

  const totalActualExpenses = expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const remainingBudget = originalEstimatedBudget - totalActualExpenses;
  const budgetUtilizationPercentage = originalEstimatedBudget > 0
    ? Math.round((totalActualExpenses / originalEstimatedBudget) * 100 * 10) / 10
    : 0;

  // Category mapping
  const categoryKeys = {
    'Transportation': 'transportation',
    'Accommodation': 'accommodation',
    'Food': 'food',
    'Activities': 'activities',
    'Miscellaneous': 'miscellaneous'
  };

  const currentBreakdown = trip.budgetBreakdown || {};
  const categoryBreakdown = Object.keys(categoryKeys).map(categoryName => {
    const key = categoryKeys[categoryName];
    const estimated = Number(currentBreakdown[key]) || 0;
    const actual = expenses
      .filter(exp => (exp.category || '').toLowerCase() === categoryName.toLowerCase())
      .reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
    const variance = actual - estimated;
    const isOverspent = actual > estimated && estimated > 0;
    const utilizationPercent = estimated > 0
      ? Math.round((actual / estimated) * 100 * 10) / 10
      : (actual > 0 ? 100 : 0);

    return {
      category: categoryName,
      estimated,
      actual,
      variance,
      isOverspent,
      utilizationPercent
    };
  });

  // Alerts
  const alerts = [];
  let status = 'HEALTHY';

  if (totalActualExpenses > originalEstimatedBudget && originalEstimatedBudget > 0) {
    status = 'EXCEEDED';
    alerts.push({
      type: 'DANGER',
      code: 'BUDGET_EXCEEDED',
      title: 'Total Budget Exceeded!',
      message: `You have spent ₹${totalActualExpenses.toLocaleString('en-IN')}, which exceeds your estimated budget of ₹${originalEstimatedBudget.toLocaleString('en-IN')} by ₹${Math.abs(remainingBudget).toLocaleString('en-IN')}.`
    });
  } else if (budgetUtilizationPercentage >= 80) {
    status = 'WARNING_80';
    alerts.push({
      type: 'WARNING',
      code: 'BUDGET_WARNING_80',
      title: 'Budget Warning (80%+)',
      message: `You have utilized ${budgetUtilizationPercentage}% of your total estimated budget. Only ₹${remainingBudget.toLocaleString('en-IN')} remaining.`
    });
  }

  // Category-specific overspending indicators
  categoryBreakdown.forEach(cat => {
    if (cat.isOverspent) {
      alerts.push({
        type: 'CATEGORY_OVERSPENT',
        code: `OVERSPENT_${cat.category.toUpperCase()}`,
        title: `${cat.category} Overspent`,
        message: `${cat.category} expenses (₹${cat.actual.toLocaleString('en-IN')}) exceed planned budget (₹${cat.estimated.toLocaleString('en-IN')}) by ₹${cat.variance.toLocaleString('en-IN')}.`
      });
    }
  });

  return {
    originalEstimatedBudget,
    totalActualExpenses,
    remainingBudget,
    budgetUtilizationPercentage,
    status,
    alerts,
    categoryBreakdown,
    expenseCount: expenses.length
  };
}

/**
 * Phase 5.1: Add a new expense
 */
exports.addExpense = async (req, res, next) => {
  try {
    const { category, amount, description, expenseDate } = req.body;

    const validCategories = ['Transportation', 'Accommodation', 'Food', 'Activities', 'Miscellaneous'];
    if (!category || !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Expense amount must be a positive number.'
      });
    }

    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (!Array.isArray(trip.actualExpenses)) {
      trip.actualExpenses = [];
    }

    const newExpense = {
      _id: new mongoose.Types.ObjectId().toString(),
      category,
      amount: parsedAmount,
      description: (description && description.trim()) || '',
      expenseDate: expenseDate ? new Date(expenseDate) : new Date(),
      createdAt: new Date()
    };

    trip.actualExpenses.push(newExpense);
    await trip.save();

    const analytics = computeBudgetAnalytics(trip);

    res.status(201).json({
      success: true,
      message: 'Expense added successfully.',
      expense: newExpense,
      analytics,
      trip
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 5.1: Get all expenses and budget analytics
 */
exports.getExpenses = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const expenses = (trip.actualExpenses || []).sort(
      (a, b) => new Date(b.expenseDate || b.createdAt) - new Date(a.expenseDate || a.createdAt)
    );
    const analytics = computeBudgetAnalytics(trip);

    res.status(200).json({
      success: true,
      expenses,
      analytics,
      trip
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 5.1: Update an existing expense
 */
exports.updateExpense = async (req, res, next) => {
  try {
    const { category, amount, description, expenseDate } = req.body;
    const { id, expenseId } = req.params;

    const trip = await Trip.findOne({ _id: id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (!Array.isArray(trip.actualExpenses)) {
      trip.actualExpenses = [];
    }

    const expenseIndex = trip.actualExpenses.findIndex(
      exp => exp._id && (exp._id.toString() === expenseId || exp._id === expenseId)
    );

    if (expenseIndex === -1) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const validCategories = ['Transportation', 'Accommodation', 'Food', 'Activities', 'Miscellaneous'];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        message: `Category must be one of: ${validCategories.join(', ')}`
      });
    }

    const existingExpense = trip.actualExpenses[expenseIndex];
    if (category) existingExpense.category = category;
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount < 0) {
        return res.status(400).json({ success: false, message: 'Expense amount must be a positive number.' });
      }
      existingExpense.amount = parsedAmount;
    }
    if (description !== undefined) existingExpense.description = description.trim();
    if (expenseDate) existingExpense.expenseDate = new Date(expenseDate);

    await trip.save();

    const analytics = computeBudgetAnalytics(trip);

    res.status(200).json({
      success: true,
      message: 'Expense updated successfully.',
      expense: existingExpense,
      analytics,
      trip
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Phase 5.1: Delete an expense
 */
exports.deleteExpense = async (req, res, next) => {
  try {
    const { id, expenseId } = req.params;

    const trip = await Trip.findOne({ _id: id, ownerId: req.user._id });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (!Array.isArray(trip.actualExpenses)) {
      trip.actualExpenses = [];
    }

    const initialLen = trip.actualExpenses.length;
    trip.actualExpenses = trip.actualExpenses.filter(
      exp => !(exp._id && (exp._id.toString() === expenseId || exp._id === expenseId))
    );

    if (trip.actualExpenses.length === initialLen) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    await trip.save();

    const analytics = computeBudgetAnalytics(trip);

    res.status(200).json({
      success: true,
      message: 'Expense deleted successfully.',
      analytics,
      trip
    });
  } catch (error) {
    next(error);
  }
};
