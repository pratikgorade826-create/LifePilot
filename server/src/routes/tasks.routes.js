const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/', taskController.create);
router.get('/', taskController.getAll);
router.put('/:id', taskController.update);
router.patch('/:id/status', taskController.updateStatus);
router.delete('/:id', taskController.delete);

module.exports = router;

