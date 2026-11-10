const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { protect } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Enforce authenticated access
router.use(protect);

// Global actions
router.post('/upload', upload.single('file'), documentController.upload);
router.get('/', documentController.getAll);
router.get('/search', documentController.searchAll);
router.post('/multi-ask', documentController.multiAsk);
router.post('/compare', documentController.compare);

// Single document actions
router.get('/:id', documentController.getOne);
router.post('/:id/summarize', documentController.summarize);
router.post('/:id/ask', documentController.ask);
router.post('/:id/study/generate', documentController.generateStudy);
router.post('/:id/study/evaluate', documentController.evaluateAnswer);
router.get('/:id/research-analysis', documentController.getResearchAnalysis);
router.get('/:id/knowledge-graph', documentController.getKnowledgeGraph);

// Knowledge-to-Action Integration
router.post('/:id/convert-action', documentController.convertAction);
router.post('/:id/convert-all-actions', documentController.convertAllActions);
router.post('/:id/convert-project', documentController.convertProject);

// Document cleanup
router.delete('/:id', documentController.delete);

module.exports = router;
