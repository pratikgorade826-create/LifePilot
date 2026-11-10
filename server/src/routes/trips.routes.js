const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect } = require('../middleware/auth');

router.use(protect);

// Generation & Base
router.post('/generate', tripController.generate);
router.post('/join', tripController.joinTrip);
router.post('/regenerate-day', tripController.regenerateDay);
router.post('/', tripController.create);
router.get('/', tripController.getAll);
router.get('/:id', tripController.getOne);
router.get('/:id/report', tripController.getReport);

// Day Regeneration
router.post('/:id/regenerate-day', tripController.regenerateDay);

// Smart Budget Optimizer
router.get('/:id/budget', tripController.getBudget);
router.post('/:id/optimize-budget', tripController.optimizeBudget);

// What-If Trip Simulator
router.post('/:id/scenarios', tripController.createScenario);
router.get('/:id/scenarios', tripController.getScenarios);
router.get('/:id/scenarios/:scenarioId', tripController.getOneScenario);
router.post('/:id/scenarios/compare', tripController.compareScenarios);
router.post('/:id/scenarios/:scenarioId/apply', tripController.applyScenario);
router.post('/:id/scenarios/restore-original', tripController.restoreOriginalItinerary);
router.delete('/:id/scenarios/:scenarioId', tripController.deleteScenario);

// Group Collaboration & Invitations
router.post('/:id/invitations', tripController.generateInviteCode);
router.get('/:id/members', tripController.getMembers);
router.put('/:id/members/:memberId', tripController.updateMemberRole);
router.delete('/:id/members/:memberId', tripController.removeMember);

// Group Polls & Voting
router.post('/:id/polls', tripController.createPoll);
router.get('/:id/polls', tripController.getPolls);
router.post('/:id/polls/:pollId/vote', tripController.votePoll);
router.put('/:id/polls/:pollId/close', tripController.closePoll);

// Group Shared Expenses & Settlements
router.post('/:id/group-expenses', tripController.addGroupExpense);
router.get('/:id/group-expenses', tripController.getGroupExpenses);
router.put('/:id/group-expenses/:expenseId', tripController.updateGroupExpense);
router.delete('/:id/group-expenses/:expenseId', tripController.deleteGroupExpense);
router.get('/:id/settlements', tripController.getSettlements);
router.post('/:id/settlements/settle', tripController.settleExpenseDebt);

// Trip Tasks & Activity Feed
router.post('/:id/tasks', tripController.createTask);
router.get('/:id/tasks', tripController.getTasks);
router.put('/:id/tasks/:taskId', tripController.updateTask);
router.delete('/:id/tasks/:taskId', tripController.deleteTask);
router.get('/:id/activity', tripController.getActivityFeed);

// Context-Aware AI Travel Companion
router.post('/:id/assistant/chat', tripController.companionChat);
router.get('/:id/assistant/history', tripController.getCompanionHistory);
router.post('/:id/assistant/command', tripController.processAssistantCommand);
router.post('/:id/assistant/apply', tripController.applyAssistantChanges);

// Feasibility & Routes
router.post('/:id/feasibility', tripController.checkFeasibility);
router.post('/:id/feasibility/apply', tripController.applyFeasibilityFix);
router.get('/:id/routes', tripController.getTripRoutes);
router.post('/:id/routes/optimize', tripController.optimizeTripRoutes);
router.put('/:id/activities/location', tripController.modifyTripLocation);

// Personal Expenses & Updates
router.post('/:id/expenses', tripController.addExpense);
router.get('/:id/expenses', tripController.getExpenses);
router.put('/:id/expenses/:expenseId', tripController.updateExpense);
router.delete('/:id/expenses/:expenseId', tripController.deleteExpense);
router.put('/:id', tripController.update);
router.delete('/:id', tripController.delete);

module.exports = router;

