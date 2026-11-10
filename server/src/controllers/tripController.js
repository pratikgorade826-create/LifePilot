const mongoose = require('mongoose');
const Trip = require('../models/Trip');
const Task = require('../models/Task');
const travelAgent = require('../services/ai/travelAgent');
const Notification = require('../models/Notification');
const tripFeasibilityChecker = require('../services/ai/tripFeasibilityChecker');
const routeOptimizer = require('../services/ai/routeOptimizer');
const tripAssistantAgent = require('../services/ai/tripAssistantAgent');
const TripScenario = require('../models/TripScenario');
const TripPoll = require('../models/TripPoll');
const TripExpense = require('../models/TripExpense');
const TripTask = require('../models/TripTask');
const TripActivity = require('../models/TripActivity');
const TravelConversation = require('../models/TravelConversation');
const budgetOptimizer = require('../services/ai/budgetOptimizer');
const scenarioSimulator = require('../services/ai/scenarioSimulator');
const groupSettlementEngine = require('../services/travel/groupSettlementEngine');

/**
 * Authorization helper: checks if user is trip owner or invited member
 */
async function findAuthorizedTrip(tripId, userId) {
  if (!tripId) return null;
  const trip = await Trip.findById(tripId);
  if (!trip) return null;
  const uId = userId ? userId.toString() : '';
  const isOwner = trip.ownerId && trip.ownerId.toString() === uId;
  const isMember = Array.isArray(trip.members) && trip.members.some(m => m.userId && m.userId.toString() === uId);
  if (!isOwner && !isMember) return null;
  return trip;
}

/**
 * Activity logging helper for real-time collaborative activity feed
 */
async function logActivity(tripId, userId, userName, action, details, metadata = {}) {
  try {
    await TripActivity.create({
      tripId,
      userId,
      userName: userName || 'Traveler',
      action,
      details,
      metadata
    });
  } catch (e) {
    console.warn('[TripActivity] Error logging activity:', e.message);
  }
}

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
      isAiGenerated: body.isAiGenerated !== undefined ? body.isAiGenerated : true,
      inviteCode: 'LPT-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
      members: [
        {
          userId,
          name: req.user.name || 'Alex Mercer',
          email: req.user.email || 'demo@lifepilot.ai',
          role: 'owner',
          joinedAt: new Date()
        }
      ],
      transportPreference: body.transportPreference || '',
      accommodationPreference: body.accommodationPreference || '',
      dietaryPreferences: body.dietaryPreferences || '',
      specialRequirements: body.specialRequirements || ''
    };

    // Store backup copy of initial itinerary
    tripData.backupItinerary = JSON.parse(JSON.stringify(tripData.itinerary));

    // Calculate feasibility report if not already attached
    if (!tripData.feasibilityReport && tripData.itinerary.length > 0) {
      const report = tripFeasibilityChecker.checkTripFeasibility(tripData);
      tripData.feasibilityScore = report.overallScore;
      tripData.feasibilityReport = report;
    }

    const trip = await Trip.create(tripData);

    // Log trip creation activity
    await logActivity(trip._id, userId, req.user.name, 'MEMBER_JOINED', `${req.user.name || 'User'} created the trip "${trip.name}"`);

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
    const userId = req.user._id;
    const query = {
      $or: [
        { ownerId: userId },
        { 'members.userId': userId }
      ]
    };

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
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
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

    const existingTrip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!existingTrip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const member = existingTrip.members?.find(m => m.userId?.toString() === req.user._id.toString());
    const isOwner = existingTrip.ownerId?.toString() === req.user._id.toString();
    if (!isOwner && member?.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Viewer role cannot modify trip.' });
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

// ========================================================
// 1. REGENERATE INDIVIDUAL DAY
// ========================================================
exports.regenerateDay = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { dayNumber, preferences, feedback, tripData } = req.body;

    let targetTrip = null;
    if (id && id !== 'draft') {
      targetTrip = await findAuthorizedTrip(id, req.user._id);
    } else if (tripData) {
      targetTrip = tripData;
    }

    if (!targetTrip) {
      return res.status(404).json({ success: false, message: 'Trip context not found.' });
    }

    const result = await travelAgent.regenerateDay({
      trip: targetTrip,
      dayNumber: parseInt(dayNumber, 10) || 1,
      preferences: preferences || '',
      feedback: feedback || ''
    });

    // If persisted trip, update the day directly in database
    if (id && id !== 'draft' && targetTrip.save) {
      const dayNum = parseInt(dayNumber, 10);
      const dayIdx = (targetTrip.itinerary || []).findIndex(d => d.day === dayNum);
      if (dayIdx !== -1) {
        targetTrip.itinerary[dayIdx] = result.day;
      } else {
        targetTrip.itinerary.push(result.day);
      }

      // Recheck feasibility
      const report = tripFeasibilityChecker.checkTripFeasibility(targetTrip);
      targetTrip.feasibilityScore = report.overallScore;
      targetTrip.feasibilityReport = report;

      await targetTrip.save();
      await logActivity(targetTrip._id, req.user._id, req.user.name, 'DAY_REGENERATED', `${req.user.name || 'User'} regenerated Day ${dayNum}: "${result.day.title}"`);
    }

    res.status(200).json({
      success: true,
      day: result.day,
      explanation: result.explanation,
      trip: targetTrip,
      isDemoOutput: result.isDemoOutput,
      provider: result.provider
    });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 2. SMART BUDGET OPTIMIZER
// ========================================================
exports.getBudget = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const optimizationResult = await budgetOptimizer.optimizeBudget({ trip });
    res.status(200).json({
      success: true,
      budget: optimizationResult.data,
      isDemoOutput: optimizationResult.isDemoOutput,
      provider: optimizationResult.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.optimizeBudget = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { targetBudget, preferredTradeoffs = [], applySavings = false } = req.body;
    const optimizationResult = await budgetOptimizer.optimizeBudget({
      trip,
      targetBudget,
      preferredTradeoffs
    });

    trip.budgetOptimization = optimizationResult.data;

    if (applySavings && optimizationResult.data.optimizedTotalBudget) {
      trip.totalBudget = optimizationResult.data.optimizedTotalBudget;
      trip.budgetPerPerson = Math.round(trip.totalBudget / Math.max(1, trip.travelersCount || 1));
      if (optimizationResult.data.categoryBreakdown) {
        trip.budgetBreakdown = {
          transportation: optimizationResult.data.categoryBreakdown.transportation?.allocated || Math.round(trip.totalBudget * 0.25),
          accommodation: optimizationResult.data.categoryBreakdown.accommodation?.allocated || Math.round(trip.totalBudget * 0.35),
          food: optimizationResult.data.categoryBreakdown.food?.allocated || Math.round(trip.totalBudget * 0.20),
          activities: optimizationResult.data.categoryBreakdown.activities?.allocated || Math.round(trip.totalBudget * 0.12),
          miscellaneous: Math.round(trip.totalBudget * 0.08),
          totalEstimated: trip.totalBudget,
          budgetPerPerson: trip.budgetPerPerson,
          isEstimateNotice: 'Budget optimized by AI Financial Analyst based on selected smart alternatives.'
        };
      }
    }

    await trip.save();
    await logActivity(trip._id, req.user._id, req.user.name, 'BUDGET_OPTIMIZED', `${req.user.name || 'User'} ran Smart Budget Optimizer (Savings: ₹${optimizationResult.data.projectedSavings?.toLocaleString('en-IN') || 0})`);

    res.status(200).json({
      success: true,
      optimization: optimizationResult.data,
      trip,
      isDemoOutput: optimizationResult.isDemoOutput,
      provider: optimizationResult.provider
    });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 3. WHAT-IF TRIP SIMULATOR
// ========================================================
exports.createScenario = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { scenarioQuery, name } = req.body;
    if (!scenarioQuery || !scenarioQuery.trim()) {
      return res.status(400).json({ success: false, message: 'Scenario query is required (e.g., "Extend trip to 7 days").' });
    }

    const simulationResult = await scenarioSimulator.simulateScenario({
      trip,
      scenarioQuery: scenarioQuery.trim(),
      scenarioName: name
    });

    const scenario = await TripScenario.create({
      tripId: trip._id,
      ownerId: req.user._id,
      ...simulationResult.data
    });

    await logActivity(trip._id, req.user._id, req.user.name, 'SCENARIO_CREATED', `${req.user.name || 'User'} created what-if scenario "${scenario.name}"`);

    res.status(201).json({
      success: true,
      message: 'What-if scenario generated successfully.',
      scenario,
      isDemoOutput: simulationResult.isDemoOutput,
      provider: simulationResult.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.getScenarios = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const scenarios = await TripScenario.find({ tripId: trip._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: scenarios.length, scenarios });
  } catch (error) {
    next(error);
  }
};

exports.getOneScenario = async (req, res, next) => {
  try {
    const scenario = await TripScenario.findOne({ _id: req.params.scenarioId, tripId: req.params.id });
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found.' });
    }
    res.status(200).json({ success: true, scenario });
  } catch (error) {
    next(error);
  }
};

exports.compareScenarios = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { scenarioIds = [] } = req.body;
    let scenarios = [];
    if (scenarioIds.length > 0) {
      scenarios = await TripScenario.find({ _id: { $in: scenarioIds }, tripId: trip._id });
    } else {
      scenarios = await TripScenario.find({ tripId: trip._id }).limit(3);
    }

    const totalActivities = (trip.itinerary || []).reduce((acc, d) => acc + (d.activities?.length || 0), 0);

    const originalPlan = {
      name: trip.name,
      totalBudget: trip.totalBudget,
      costPerPerson: trip.budgetPerPerson || Math.round(trip.totalBudget / Math.max(1, trip.travelersCount || 1)),
      durationDays: trip.durationDays,
      travelersCount: trip.travelersCount,
      travelStyle: trip.travelStyle,
      feasibilityScore: trip.feasibilityScore || 85,
      totalActivities,
      itinerary: trip.itinerary,
      budgetBreakdown: trip.budgetBreakdown
    };

    res.status(200).json({
      success: true,
      comparison: {
        original: originalPlan,
        scenarios
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.applyScenario = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const member = trip.members?.find(m => m.userId?.toString() === req.user._id.toString());
    const isOwner = trip.ownerId?.toString() === req.user._id.toString();
    if (!isOwner && member?.role === 'viewer') {
      return res.status(403).json({ success: false, message: 'Viewers cannot apply scenarios.' });
    }

    const scenario = await TripScenario.findOne({ _id: req.params.scenarioId, tripId: trip._id });
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found.' });
    }

    // Backup current itinerary and budget before applying
    trip.backupItinerary = JSON.parse(JSON.stringify(trip.itinerary || []));
    trip.originalTripData = {
      totalBudget: trip.totalBudget,
      durationDays: trip.durationDays,
      itinerary: JSON.parse(JSON.stringify(trip.itinerary || [])),
      budgetBreakdown: trip.budgetBreakdown
    };

    // Apply scenario changes
    if (scenario.itinerary && scenario.itinerary.length > 0) {
      trip.itinerary = scenario.itinerary;
    }
    if (scenario.proposedDuration) {
      trip.durationDays = scenario.proposedDuration;
      const dep = new Date(trip.departureDate);
      const ret = new Date(dep.getTime() + scenario.proposedDuration * 86400000);
      trip.returnDate = ret;
    }
    if (scenario.proposedBudget) {
      trip.totalBudget = scenario.proposedBudget;
      trip.budgetPerPerson = scenario.costPerPerson || Math.round(scenario.proposedBudget / Math.max(1, trip.travelersCount || 1));
    }
    if (scenario.budgetBreakdown) {
      trip.budgetBreakdown = {
        transportation: scenario.budgetBreakdown.transportation || Math.round(trip.totalBudget * 0.25),
        accommodation: scenario.budgetBreakdown.accommodation || Math.round(trip.totalBudget * 0.35),
        food: scenario.budgetBreakdown.food || Math.round(trip.totalBudget * 0.20),
        activities: scenario.budgetBreakdown.activities || Math.round(trip.totalBudget * 0.12),
        miscellaneous: Math.max(0, trip.totalBudget - Math.round(trip.totalBudget * 0.92)),
        totalEstimated: trip.totalBudget,
        budgetPerPerson: trip.budgetPerPerson,
        isEstimateNotice: `Applied from scenario "${scenario.name}".`
      };
    }

    // Recheck feasibility
    const report = tripFeasibilityChecker.checkTripFeasibility(trip);
    trip.feasibilityScore = report.overallScore;
    trip.feasibilityReport = report;

    await trip.save();

    // Mark scenario as applied
    scenario.isApplied = true;
    scenario.appliedAt = new Date();
    await scenario.save();

    await logActivity(trip._id, req.user._id, req.user.name, 'SCENARIO_APPLIED', `${req.user.name || 'User'} applied what-if scenario "${scenario.name}" to the primary itinerary.`);

    res.status(200).json({
      success: true,
      message: `Scenario "${scenario.name}" successfully applied to primary itinerary. (Safety backup preserved)`,
      trip,
      scenario
    });
  } catch (error) {
    next(error);
  }
};

exports.restoreOriginalItinerary = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (!trip.backupItinerary || trip.backupItinerary.length === 0) {
      return res.status(400).json({ success: false, message: 'No backup itinerary found to restore.' });
    }

    if (trip.originalTripData) {
      trip.itinerary = trip.originalTripData.itinerary || trip.backupItinerary;
      trip.totalBudget = trip.originalTripData.totalBudget || trip.totalBudget;
      trip.durationDays = trip.originalTripData.durationDays || trip.itinerary.length;
      trip.budgetBreakdown = trip.originalTripData.budgetBreakdown || trip.budgetBreakdown;
      trip.budgetPerPerson = Math.round(trip.totalBudget / Math.max(1, trip.travelersCount || 1));
    } else {
      trip.itinerary = trip.backupItinerary;
      trip.durationDays = trip.backupItinerary.length;
    }

    // Reset applied state on scenarios
    await TripScenario.updateMany({ tripId: trip._id }, { isApplied: false });

    // Recheck feasibility
    const report = tripFeasibilityChecker.checkTripFeasibility(trip);
    trip.feasibilityScore = report.overallScore;
    trip.feasibilityReport = report;

    await trip.save();
    await logActivity(trip._id, req.user._id, req.user.name, 'ORIGINAL_RESTORED', `${req.user.name || 'User'} restored the original trip plan.`);

    res.status(200).json({
      success: true,
      message: 'Original itinerary and budget restored successfully.',
      trip
    });
  } catch (error) {
    next(error);
  }
};

exports.deleteScenario = async (req, res, next) => {
  try {
    const scenario = await TripScenario.findOneAndDelete({ _id: req.params.scenarioId, tripId: req.params.id });
    if (!scenario) {
      return res.status(404).json({ success: false, message: 'Scenario not found.' });
    }
    res.status(200).json({ success: true, message: 'Scenario deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 4. GROUP COLLABORATION & INVITATIONS
// ========================================================
exports.generateInviteCode = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    if (!trip.inviteCode) {
      trip.inviteCode = 'LPT-' + Math.random().toString(36).substring(2, 7).toUpperCase();
      await trip.save();
    }

    res.status(200).json({
      success: true,
      inviteCode: trip.inviteCode,
      tripName: trip.name,
      destination: trip.destination
    });
  } catch (error) {
    next(error);
  }
};

exports.joinTrip = async (req, res, next) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode || !inviteCode.trim()) {
      return res.status(400).json({ success: false, message: 'Invite code is required.' });
    }

    const code = inviteCode.trim().toUpperCase();
    const trip = await Trip.findOne({ inviteCode: code });
    if (!trip) {
      return res.status(404).json({ success: false, message: 'No trip found matching this invite code.' });
    }

    if (!Array.isArray(trip.members)) {
      trip.members = [];
    }

    const existingMember = trip.members.find(
      m => m.userId && (m.userId.toString() === req.user._id.toString() || m.userId === req.user._id)
    );

    if (existingMember) {
      return res.status(200).json({
        success: true,
        message: 'You are already a member of this trip.',
        trip
      });
    }

    trip.members.push({
      userId: req.user._id,
      name: req.user.name || 'Traveler',
      email: req.user.email || '',
      role: 'editor',
      joinedAt: new Date()
    });

    await trip.save();
    await logActivity(trip._id, req.user._id, req.user.name, 'MEMBER_JOINED', `${req.user.name || 'A traveler'} joined the trip via invite code ${code}`);

    res.status(200).json({
      success: true,
      message: `Successfully joined "${trip.name}"!`,
      trip
    });
  } catch (error) {
    next(error);
  }
};

exports.getMembers = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }
    res.status(200).json({ success: true, members: trip.members || [] });
  } catch (error) {
    next(error);
  }
};

exports.updateMemberRole = async (req, res, next) => {
  try {
    const trip = await Trip.findOne({ _id: req.params.id, ownerId: req.user._id });
    if (!trip) {
      return res.status(403).json({ success: false, message: 'Only the trip owner can change member roles.' });
    }

    const { role } = req.body;
    if (!['editor', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: 'Role must be "editor" or "viewer".' });
    }

    const member = (trip.members || []).find(
      m => (m.userId && m.userId.toString() === req.params.memberId) || (m._id && m._id.toString() === req.params.memberId)
    );
    if (!member) {
      return res.status(404).json({ success: false, message: 'Member not found.' });
    }

    member.role = role;
    await trip.save();
    await logActivity(trip._id, req.user._id, req.user.name, 'ROLE_UPDATED', `Updated ${member.name}'s role to ${role}`);

    res.status(200).json({ success: true, message: `Member role updated to ${role}.`, members: trip.members });
  } catch (error) {
    next(error);
  }
};

exports.removeMember = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const isOwner = trip.ownerId && trip.ownerId.toString() === req.user._id.toString();
    const isSelf = req.params.memberId === req.user._id.toString();

    if (!isOwner && !isSelf) {
      return res.status(403).json({ success: false, message: 'Only the owner can remove other members.' });
    }

    const memberToRemove = (trip.members || []).find(
      m => (m.userId && m.userId.toString() === req.params.memberId) || (m._id && m._id.toString() === req.params.memberId)
    );

    trip.members = (trip.members || []).filter(
      m => !((m.userId && m.userId.toString() === req.params.memberId) || (m._id && m._id.toString() === req.params.memberId))
    );

    await trip.save();
    await logActivity(trip._id, req.user._id, req.user.name, 'MEMBER_REMOVED', `${memberToRemove?.name || 'A member'} left the group trip`);

    res.status(200).json({ success: true, message: 'Member removed.', members: trip.members });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 5. GROUP VOTING & POLLS
// ========================================================
exports.createPoll = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { title, category = 'general', options = [] } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Poll title is required.' });
    }
    if (!Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ success: false, message: 'At least 2 options are required for a poll.' });
    }

    const formattedOptions = options.map(opt => ({
      text: typeof opt === 'string' ? opt.trim() : (opt.text || '').trim(),
      votes: []
    })).filter(o => o.text.length > 0);

    const poll = await TripPoll.create({
      tripId: trip._id,
      creatorId: req.user._id,
      creatorName: req.user.name || 'Trip Member',
      title: title.trim(),
      category,
      options: formattedOptions,
      status: 'open'
    });

    await logActivity(trip._id, req.user._id, req.user.name, 'POLL_CREATED', `${req.user.name || 'User'} created poll: "${poll.title}"`);

    res.status(201).json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

exports.getPolls = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const polls = await TripPoll.find({ tripId: trip._id }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: polls.length, polls });
  } catch (error) {
    next(error);
  }
};

exports.votePoll = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const poll = await TripPoll.findOne({ _id: req.params.pollId, tripId: trip._id });
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }
    if (poll.status === 'closed') {
      return res.status(400).json({ success: false, message: 'This poll is closed for voting.' });
    }

    const optionIndex = parseInt(req.body.optionIndex, 10);
    if (isNaN(optionIndex) || optionIndex < 0 || optionIndex >= poll.options.length) {
      return res.status(400).json({ success: false, message: 'Invalid option selected.' });
    }

    // Remove any previous vote from this user to prevent duplicate votes
    const userIdStr = req.user._id.toString();
    poll.options.forEach(opt => {
      if (Array.isArray(opt.votes)) {
        opt.votes = opt.votes.filter(v => v.userId && v.userId.toString() !== userIdStr);
      } else {
        opt.votes = [];
      }
    });

    // Cast vote for the chosen option
    poll.options[optionIndex].votes.push({
      userId: req.user._id,
      userName: req.user.name || 'Traveler',
      votedAt: new Date()
    });

    await poll.save();
    await logActivity(trip._id, req.user._id, req.user.name, 'VOTE_CAST', `${req.user.name || 'User'} voted in poll: "${poll.title}"`);

    res.status(200).json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

exports.closePoll = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const poll = await TripPoll.findOne({ _id: req.params.pollId, tripId: trip._id });
    if (!poll) {
      return res.status(404).json({ success: false, message: 'Poll not found.' });
    }

    // Determine winning option
    let winner = 'No votes cast';
    let maxVotes = -1;
    (poll.options || []).forEach(opt => {
      const vCount = opt.votes?.length || 0;
      if (vCount > maxVotes) {
        maxVotes = vCount;
        winner = opt.text;
      }
    });

    poll.status = 'closed';
    poll.winner = winner;
    poll.closedAt = new Date();
    await poll.save();

    await logActivity(trip._id, req.user._id, req.user.name, 'POLL_CLOSED', `Poll closed: "${poll.title}". Winning option: ${winner}`);

    res.status(200).json({ success: true, poll });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 6. GROUP EXPENSES & SPLITWISE-STYLE SETTLEMENTS
// ========================================================
exports.addGroupExpense = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const {
      title,
      category = 'Food',
      amount,
      paidBy,
      splitType = 'equal',
      participants = [],
      notes = '',
      expenseDate = new Date()
    } = req.body;

    const parsedAmount = Math.max(0, parseFloat(amount) || 0);
    if (!title || !title.trim() || parsedAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Valid title and positive amount are required.' });
    }

    const payer = paidBy && paidBy.userName
      ? paidBy
      : { userId: req.user._id, userName: req.user.name || 'Alex Mercer' };

    // Format participants and their shares
    let splitParticipants = [];
    if (Array.isArray(participants) && participants.length > 0) {
      if (splitType === 'equal') {
        const share = Math.round((parsedAmount / participants.length) * 100) / 100;
        splitParticipants = participants.map(p => ({
          userId: p.userId,
          userName: p.userName || 'Member',
          shareAmount: share,
          isSettled: p.userId && p.userId.toString() === payer.userId?.toString()
        }));
      } else {
        splitParticipants = participants.map(p => ({
          userId: p.userId,
          userName: p.userName || 'Member',
          shareAmount: Math.max(0, parseFloat(p.shareAmount) || 0),
          isSettled: Boolean(p.isSettled)
        }));
      }
    } else {
      splitParticipants = [{
        userId: payer.userId,
        userName: payer.userName,
        shareAmount: parsedAmount,
        isSettled: true
      }];
    }

    const expense = await TripExpense.create({
      tripId: trip._id,
      title: title.trim(),
      category,
      amount: parsedAmount,
      paidBy: payer,
      splitType,
      participants: splitParticipants,
      notes,
      expenseDate
    });

    await logActivity(trip._id, req.user._id, req.user.name, 'EXPENSE_ADDED', `${payer.userName} added expense "₹${parsedAmount.toLocaleString('en-IN')}: ${title}" (${category})`);

    res.status(201).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

exports.getGroupExpenses = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const expenses = await TripExpense.find({ tripId: trip._id }).sort({ expenseDate: -1, createdAt: -1 });
    res.status(200).json({ success: true, count: expenses.length, expenses });
  } catch (error) {
    next(error);
  }
};

exports.updateGroupExpense = async (req, res, next) => {
  try {
    const expense = await TripExpense.findById(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }

    const updateFields = { ...req.body };
    delete updateFields._id;
    delete updateFields.tripId;

    Object.assign(expense, updateFields);
    await expense.save();

    res.status(200).json({ success: true, expense });
  } catch (error) {
    next(error);
  }
};

exports.deleteGroupExpense = async (req, res, next) => {
  try {
    const expense = await TripExpense.findByIdAndDelete(req.params.expenseId);
    if (!expense) {
      return res.status(404).json({ success: false, message: 'Expense not found.' });
    }
    res.status(200).json({ success: true, message: 'Expense deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.getSettlements = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const expenses = await TripExpense.find({ tripId: trip._id });
    const members = trip.members && trip.members.length > 0
      ? trip.members
      : [{ userId: trip.ownerId, name: req.user.name || 'Owner' }];

    const report = groupSettlementEngine.calculateSettlements(expenses, members);
    res.status(200).json({ success: true, report });
  } catch (error) {
    next(error);
  }
};

exports.settleExpenseDebt = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { fromName, toName, amount } = req.body;
    await logActivity(trip._id, req.user._id, req.user.name, 'EXPENSE_SETTLED', `${fromName} paid ₹${Number(amount || 0).toLocaleString('en-IN')} to ${toName} (settlement recorded)`);

    res.status(200).json({
      success: true,
      message: `Settlement of ₹${amount} from ${fromName} to ${toName} recorded.`
    });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 7. TRIP TASKS & COLLABORATIVE ASSIGNMENTS
// ========================================================
exports.createTask = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { title, category = 'General', assignedTo, deadline, priority = 'Medium' } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Task title is required.' });
    }

    const task = await TripTask.create({
      tripId: trip._id,
      title: title.trim(),
      category,
      assignedTo: assignedTo || { userName: req.user.name || 'Alex Mercer' },
      deadline: deadline ? new Date(deadline) : null,
      priority,
      status: 'pending'
    });

    await logActivity(trip._id, req.user._id, req.user.name, 'TASK_CREATED', `${req.user.name || 'User'} created task: "${task.title}"`);

    res.status(201).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

exports.getTasks = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const tasks = await TripTask.find({ tripId: trip._id }).sort({ status: 1, deadline: 1, createdAt: -1 });
    res.status(200).json({ success: true, count: tasks.length, tasks });
  } catch (error) {
    next(error);
  }
};

exports.updateTask = async (req, res, next) => {
  try {
    const task = await TripTask.findById(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }

    const oldStatus = task.status;
    const updateFields = { ...req.body };
    delete updateFields._id;
    delete updateFields.tripId;

    if (updateFields.status === 'completed' && oldStatus !== 'completed') {
      updateFields.completedAt = new Date();
      await logActivity(task.tripId, req.user._id, req.user.name, 'TASK_COMPLETED', `${req.user.name || 'User'} completed task: "${task.title}"`);
    }

    Object.assign(task, updateFields);
    await task.save();

    res.status(200).json({ success: true, task });
  } catch (error) {
    next(error);
  }
};

exports.deleteTask = async (req, res, next) => {
  try {
    const task = await TripTask.findByIdAndDelete(req.params.taskId);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found.' });
    }
    res.status(200).json({ success: true, message: 'Task deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 8. ACTIVITY FEED
// ========================================================
exports.getActivityFeed = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const activities = await TripActivity.find({ tripId: trip._id }).sort({ createdAt: -1 }).limit(50);
    res.status(200).json({ success: true, count: activities.length, activities });
  } catch (error) {
    next(error);
  }
};

// ========================================================
// 9. CONTEXT-AWARE AI TRAVEL COMPANION CHAT
// ========================================================
exports.companionChat = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const cleanMsg = message.trim();

    // Check if the message requests an actionable modification
    let actionPreview = null;
    const modKeywords = ['change', 'add', 'remove', 'delete', 'replace', 'swap', 'budget', 'timing', 'dates', 'luxury', 'vegetarian', 'hotel'];
    const isActionRequest = modKeywords.some(kw => cleanMsg.toLowerCase().includes(kw));

    if (isActionRequest) {
      try {
        actionPreview = await tripAssistantAgent.interpretAndProposeChange(trip, cleanMsg);
      } catch (err) {
        console.warn('[TripCompanion] Action interpretation warning:', err.message);
      }
    }

    // Generate conversational response
    let reply = '';
    if (actionPreview && actionPreview.summary) {
      reply = `I've analyzed your trip and prepared a change preview:\n\n**${actionPreview.summary}**\n\n${actionPreview.impactSummary}\n\nYou can review and approve this change below before it's saved.`;
    } else {
      // Natural language Q&A about current trip
      const textLower = cleanMsg.toLowerCase();
      if (textLower.includes('tomorrow') || textLower.includes('day 2') || textLower.includes('day 1')) {
        const targetDay = textLower.includes('day 2') ? 2 : (textLower.includes('day 1') ? 1 : 2);
        const dayPlan = (trip.itinerary || []).find(d => d.day === targetDay);
        if (dayPlan) {
          reply = `Here is your schedule for **Day ${targetDay}: ${dayPlan.title}** (${dayPlan.theme}):\n\n` +
            (dayPlan.activities || []).map(a => `• **${a.time}**: ${a.title} (${a.location}) — ₹${a.estimatedCost}`).join('\n') +
            `\n\nDining: ${dayPlan.meals?.lunch || 'Local dining'} | Stay: ${dayPlan.stay || 'Local hotel'}`;
        } else {
          reply = `Your trip has ${trip.itinerary?.length || 0} scheduled days. What would you like to review?`;
        }
      } else if (textLower.includes('budget') || textLower.includes('remaining') || textLower.includes('expense')) {
        reply = `Your total planned budget is **₹${(trip.totalBudget || 0).toLocaleString('en-IN')}** (approx ₹${(trip.budgetPerPerson || 0).toLocaleString('en-IN')}/person across ${trip.travelersCount || 1} traveler(s)).\n\nBreakdown:\n• Lodging: ₹${trip.budgetBreakdown?.accommodation?.toLocaleString('en-IN') || 0}\n• Travel: ₹${trip.budgetBreakdown?.transportation?.toLocaleString('en-IN') || 0}\n• Meals: ₹${trip.budgetBreakdown?.food?.toLocaleString('en-IN') || 0}\n• Activities: ₹${trip.budgetBreakdown?.activities?.toLocaleString('en-IN') || 0}`;
      } else {
        reply = `I am your personal AI Travel Companion for **"${trip.name || trip.destination}"**. I have full context on your ${trip.durationDays || 5}-day itinerary and budget.\n\nYou can ask me to modify any day, suggest nearby dining, optimize remaining funds, or simulate what-if scenarios!`;
      }
    }

    // Persist conversation
    let conv = await TravelConversation.findOne({ tripId: trip._id, userId: req.user._id });
    if (!conv) {
      conv = await TravelConversation.create({
        tripId: trip._id,
        userId: req.user._id,
        messages: []
      });
    }

    conv.messages.push({
      role: 'user',
      content: cleanMsg,
      timestamp: new Date()
    });
    conv.messages.push({
      role: 'assistant',
      content: reply,
      actionPreview: actionPreview || null,
      timestamp: new Date()
    });
    await conv.save();

    res.status(200).json({
      success: true,
      reply,
      actionPreview
    });
  } catch (error) {
    next(error);
  }
};

exports.getCompanionHistory = async (req, res, next) => {
  try {
    const trip = await findAuthorizedTrip(req.params.id, req.user._id);
    if (!trip) {
      return res.status(404).json({ success: false, message: 'Trip not found or unauthorized.' });
    }

    const conv = await TravelConversation.findOne({ tripId: trip._id, userId: req.user._id });
    res.status(200).json({
      success: true,
      messages: conv ? conv.messages : []
    });
  } catch (error) {
    next(error);
  }
};

