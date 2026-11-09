const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Trip = require('../models/Trip');
const Project = require('../models/Project');
const Task = require('../models/Task');
const Notification = require('../models/Notification');
const orchestrator = require('../services/ai/orchestrator');
const intentClassifier = require('../services/ai/intentClassifier');

exports.chat = async (req, res, next) => {
  try {
    const { message, conversationId, contextDocumentId } = req.body;
    const userId = req.user._id;

    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty.' });
    }

    let conversation = null;
    if (conversationId) {
      conversation = await Conversation.findOne({ _id: conversationId, ownerId: userId });
    }

    if (!conversation) {
      // Create new conversation with auto-generated title
      const title = message.trim().slice(0, 40) + (message.length > 40 ? '...' : '');
      conversation = await Conversation.create({
        ownerId: userId,
        title,
        lastMessageAt: new Date()
      });
    }

    // Save user message
    await Message.create({
      conversationId: conversation._id,
      ownerId: userId,
      sender: 'user',
      content: message
    });

    // Run orchestrator
    const orchestratorResult = await orchestrator.processUserMessage({
      userId,
      message,
      conversationId: conversation._id,
      contextDocumentId
    });

    // Update conversation intent & lastMessageAt
    conversation.intent = orchestratorResult.intent;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Save assistant message
    const assistantMsg = await Message.create({
      conversationId: conversation._id,
      ownerId: userId,
      sender: 'assistant',
      content: orchestratorResult.content,
      intent: orchestratorResult.intent,
      structuredData: orchestratorResult.structuredData,
      actionSuggested: orchestratorResult.actionSuggested,
      actionStatus: 'pending',
      isDemoOutput: orchestratorResult.isDemoOutput
    });

    res.status(200).json({
      success: true,
      conversationId: conversation._id,
      message: assistantMsg,
      classification: orchestratorResult.classification,
      isDemoOutput: orchestratorResult.isDemoOutput,
      provider: orchestratorResult.provider
    });
  } catch (error) {
    next(error);
  }
};

exports.classify = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ success: false, message: 'Text is required for classification.' });
    }

    const result = await intentClassifier.classify(text);
    res.status(200).json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
};

exports.getConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ ownerId: req.user._id })
      .sort({ lastMessageAt: -1 })
      .limit(30);

    res.status(200).json({ success: true, count: conversations.length, conversations });
  } catch (error) {
    next(error);
  }
};

exports.getMessages = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOne({ _id: conversationId, ownerId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversationId, ownerId: req.user._id })
      .sort({ createdAt: 1 });

    res.status(200).json({ success: true, count: messages.length, messages, conversation });
  } catch (error) {
    next(error);
  }
};

exports.deleteConversation = async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findOneAndDelete({ _id: conversationId, ownerId: req.user._id });

    if (!conversation) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    await Message.deleteMany({ conversationId });
    res.status(200).json({ success: true, message: 'Conversation deleted successfully.' });
  } catch (error) {
    next(error);
  }
};

exports.approveAction = async (req, res, next) => {
  try {
    const { messageId, actionType, customData } = req.body;
    const userId = req.user._id;

    const message = await Message.findOne({ _id: messageId, ownerId: userId });
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    const data = customData || message.structuredData;
    if (!data) {
      return res.status(400).json({ success: false, message: 'No structured data found to approve.' });
    }

    let createdRecord = null;
    let notificationMsg = '';

    if (actionType === 'SAVE_TRIP') {
      const departureDate = new Date();
      departureDate.setDate(departureDate.getDate() + 14);
      const returnDate = new Date(departureDate);
      returnDate.setDate(returnDate.getDate() + (data.durationDays || 5));

      createdRecord = await Trip.create({
        ownerId: userId,
        name: data.name || `${data.destination} Trip`,
        startingLocation: data.startingLocation || 'Current City',
        destination: data.destination || 'Destination',
        departureDate: data.departureDate || departureDate,
        returnDate: data.returnDate || returnDate,
        travelersCount: data.travelersCount || 1,
        totalBudget: data.budgetBreakdown?.totalEstimated || 20000,
        budgetPerPerson: data.budgetBreakdown?.budgetPerPerson || 20000,
        travelStyle: data.travelStyle || 'Standard',
        interests: data.interests || ['Beaches', 'Food'],
        overview: data.overview || '',
        itinerary: data.itinerary || [],
        budgetBreakdown: data.budgetBreakdown || {},
        packingChecklist: data.packingChecklist || [],
        preparationChecklist: data.preparationChecklist || [],
        isAiGenerated: true
      });

      // Also create preparation tasks in Central Task Manager
      if (data.preparationChecklist && data.preparationChecklist.length > 0) {
        for (const prep of data.preparationChecklist.slice(0, 3)) {
          await Task.create({
            ownerId: userId,
            title: prep.task,
            description: `Trip Preparation for ${createdRecord.name}`,
            priority: 'Medium',
            originType: 'TRIP',
            originId: createdRecord._id,
            originModel: 'Trip',
            originLabel: createdRecord.name,
            dueDate: departureDate
          });
        }
      }

      notificationMsg = `Trip "${createdRecord.name}" saved to your planner!`;
    } else if (actionType === 'CREATE_PROJECT') {
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + (data.durationDays || 10));

      createdRecord = await Project.create({
        ownerId: userId,
        name: data.name || 'AI Planned Project',
        description: data.description || '',
        category: data.category || 'Development',
        priority: data.priority || 'High',
        startDate: new Date(),
        deadline,
        objectives: data.objectives || [],
        milestones: data.milestones || [],
        completionChecklist: data.completionChecklist || [],
        progress: 0,
        isAiGenerated: true
      });

      // Create tasks for the project
      if (data.tasks && data.tasks.length > 0) {
        for (const t of data.tasks) {
          const taskDue = new Date();
          taskDue.setDate(taskDue.getDate() + (t.targetDayOffset || 2));

          await Task.create({
            ownerId: userId,
            title: t.title,
            description: t.description || '',
            priority: t.priority || 'Medium',
            originType: 'PROJECT',
            originId: createdRecord._id,
            originModel: 'Project',
            originLabel: createdRecord.name,
            dueDate: taskDue,
            estimatedDuration: t.estimatedDuration || '2 hours',
            tags: t.tags || ['project']
          });
        }
      }

      notificationMsg = `Project "${createdRecord.name}" created with ${data.tasks?.length || 0} tasks!`;
    } else if (actionType === 'CREATE_TASKS') {
      const taskPayload = data.task || data;
      createdRecord = await Task.create({
        ownerId: userId,
        title: taskPayload.title,
        description: taskPayload.description || '',
        priority: taskPayload.priority || 'Medium',
        dueDate: taskPayload.dueDate || new Date(),
        originType: 'AI_ASSISTANT',
        estimatedDuration: taskPayload.estimatedDuration || '1 hour'
      });
      notificationMsg = `Task "${createdRecord.title}" added to Task Manager!`;
    }

    // Update message state
    message.actionStatus = 'saved';
    await message.save();

    // Create persistent notification
    await Notification.create({
      ownerId: userId,
      title: 'Action Completed',
      message: notificationMsg,
      type: actionType === 'SAVE_TRIP' ? 'TRAVEL' : actionType === 'CREATE_PROJECT' ? 'PROJECT' : 'TASK'
    });

    res.status(200).json({
      success: true,
      message: notificationMsg,
      record: createdRecord
    });
  } catch (error) {
    next(error);
  }
};

