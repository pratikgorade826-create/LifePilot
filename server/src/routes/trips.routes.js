const express = require('express');
const router = express.Router();
const tripController = require('../controllers/tripController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/generate', tripController.generate);
router.post('/', tripController.create);
router.get('/', tripController.getAll);
router.get('/:id', tripController.getOne);
router.get('/:id/report', tripController.getReport);
router.post('/:id/feasibility', tripController.checkFeasibility);
router.post('/:id/feasibility/apply', tripController.applyFeasibilityFix);
router.post('/:id/assistant/command', tripController.processAssistantCommand);
router.post('/:id/assistant/apply', tripController.applyAssistantChanges);
router.post('/:id/expenses', tripController.addExpense);
router.get('/:id/expenses', tripController.getExpenses);
router.put('/:id/expenses/:expenseId', tripController.updateExpense);
router.delete('/:id/expenses/:expenseId', tripController.deleteExpense);
router.get('/:id/routes', tripController.getTripRoutes);
router.post('/:id/routes/optimize', tripController.optimizeTripRoutes);
router.put('/:id/activities/location', tripController.modifyTripLocation);
router.put('/:id', tripController.update);
router.delete('/:id', tripController.delete);

module.exports = router;

