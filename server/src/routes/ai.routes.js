const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.post('/chat', aiController.chat);
router.post('/classify', aiController.classify);
router.get('/conversations', aiController.getConversations);
router.get('/conversations/:conversationId/messages', aiController.getMessages);
router.delete('/conversations/:conversationId', aiController.deleteConversation);
router.post('/action/approve', aiController.approveAction);

module.exports = router;
