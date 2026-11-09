const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

router.use(protect);

router.post('/upload', upload.single('file'), documentController.upload);
router.get('/', documentController.getAll);
router.get('/:id', documentController.getOne);
router.post('/:id/summarize', documentController.summarize);
router.post('/:id/ask', documentController.ask);
router.post('/:id/convert-action', documentController.convertAction);
router.delete('/:id', documentController.delete);

module.exports = router;

