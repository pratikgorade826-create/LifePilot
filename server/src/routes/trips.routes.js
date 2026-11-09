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
router.put('/:id', tripController.update);
router.delete('/:id', tripController.delete);

module.exports = router;
