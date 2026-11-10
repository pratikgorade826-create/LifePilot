const intentClassifier = require('./intentClassifier');
const travelAgent = require('./travelAgent');
const projectAgent = require('./projectAgent');
const knowledgeAgent = require('./knowledgeAgent');
const aiProvider = require('./aiProvider');
const Document = require('../../models/Document');
const documentRetriever = require('../documents/documentRetriever');

class Orchestrator {
  async processUserMessage({ userId, message, conversationId, contextDocumentId = null }) {
    // Step 1: Detect intent
    const classification = await intentClassifier.classify(message);
    const intent = classification.intent;

    let responseContent = '';
    let structuredData = null;
    let actionSuggested = null;
    let isDemoOutput = false;
    let provider = 'auto';

    switch (intent) {
      case 'TRAVEL': {
        // Extract basic parameters from text or defaults
        const daysMatch = message.match(/(\d+)\s*[- ]*(day|days|d\b)/i);
        const days = daysMatch ? parseInt(daysMatch[1], 10) : 5;

        const budgetMatch = message.match(/(?:under|budget|rs\.?|₹|inr)\s*([\d,]+)/i);
        let budget = 40000;
        if (budgetMatch) {
          budget = parseInt(budgetMatch[1].replace(/,/g, ''), 10) || 40000;
          if (budget < 1000) budget = budget * 1000; // e.g. "15k"
        }

        // Detect destination keyword
        let dest = classification.extractedEntities?.destination;
        if (!dest) {
          const commonDestinations = ['Goa', 'Hyderabad', 'Manali', 'Kerala', 'Jaipur', 'Shimla', 'Kashmir', 'Ladakh', 'Dubai', 'Bali', 'Singapore', 'Paris', 'Bangalore', 'Delhi', 'Mumbai', 'Ooty'];
          for (const cd of commonDestinations) {
            if (new RegExp(`\\b${cd}\\b`, 'i').test(message)) {
              dest = cd;
              break;
            }
          }
        }
        if (!dest) {
          const toMatch = message.match(/(?:to|visit|in)\s+([A-Za-z]+)/i);
          if (toMatch && !['a', 'the', 'plan', 'trip', 'me', 'our'].includes(toMatch[1].toLowerCase())) {
            dest = toMatch[1].charAt(0).toUpperCase() + toMatch[1].slice(1);
          }
        }
        if (!dest) dest = 'Goa';

        const tripResult = await travelAgent.planTrip({
          prompt: message,
          destination: dest,
          durationDays: days,
          totalBudget: budget,
          travelersCount: 4
        });

        structuredData = tripResult.data;
        isDemoOutput = tripResult.isDemoOutput;
        provider = tripResult.provider;
        actionSuggested = 'SAVE_TRIP';

        responseContent = `I have planned a **${tripResult.data.durationDays}-Day itinerary for ${tripResult.data.destination}** under an estimated budget of **₹${tripResult.data.budgetBreakdown.totalEstimated.toLocaleString('en-IN')}**.\n\n### Highlights:\n- **Overview:** ${tripResult.data.overview}\n- **Duration:** ${tripResult.data.durationDays} Days / ${tripResult.data.durationDays - 1} Nights\n- **Estimated Budget/Person:** ₹${tripResult.data.budgetBreakdown.budgetPerPerson?.toLocaleString('en-IN')}\n\nReview the detailed day-by-day plan and budget breakdown below. Click **"Save to My Trips"** to add this to your personal itinerary!`;
        break;
      }

      case 'PROJECT': {
        const daysMatch = message.match(/(\d+)\s*[- ]*(day|days|week|weeks)/i);
        let days = 10;
        if (daysMatch) {
          const val = parseInt(daysMatch[1], 10);
          days = /week/i.test(daysMatch[2]) ? val * 7 : val;
        }

        const projectResult = await projectAgent.planProject({
          prompt: message,
          name: 'Project Roadmap',
          durationDays: days
        });

        structuredData = projectResult.data;
        isDemoOutput = projectResult.isDemoOutput;
        provider = projectResult.provider;
        actionSuggested = 'CREATE_PROJECT';

        responseContent = `I have organized your project into a structured **${projectResult.data.durationDays}-day execution plan** with **${projectResult.data.milestones.length} milestones** and **${projectResult.data.tasks.length} actionable tasks**.\n\n### Objectives:\n${projectResult.data.objectives.map(o => `- ${o}`).join('\n')}\n\nReview the tasks and milestones below. Click **"Create Project & Tasks"** to track this in your Kanban board!`;
        break;
      }

      case 'KNOWLEDGE': {
        // If user referenced a document or document context is provided
        let targetDoc = null;
        if (contextDocumentId) {
          targetDoc = await Document.findOne({ _id: contextDocumentId, ownerId: userId });
        } else {
          // Look for latest document uploaded by user
          targetDoc = await Document.findOne({ ownerId: userId }).sort({ createdAt: -1 });
        }

        if (targetDoc) {
          const chunks = await documentRetriever.retrieveChunks(targetDoc._id, message, 3);
          const qna = await knowledgeAgent.answerDocumentQuestion({
            document: targetDoc,
            chunks,
            question: message
          });

          responseContent = qna.answer;
          structuredData = {
            documentId: targetDoc._id,
            documentName: targetDoc.originalName,
            sources: qna.sources,
            actionItems: targetDoc.actionItems || []
          };
          isDemoOutput = qna.isDemoOutput;
          provider = qna.provider;
          actionSuggested = targetDoc.actionItems?.length ? 'CREATE_TASKS' : null;
        } else {
          responseContent = `I am ready to analyze your documents, extract requirements, and answer questions. Currently, no uploaded documents were found in your library.\n\nPlease upload a **PDF, DOCX, or TXT file** in the **Personal Knowledge Hub**, or select an existing document to begin AI analysis.`;
        }
        break;
      }

      case 'TASK': {
        // Extract task title
        const cleanTitle = message
          .replace(/^(please\s*)?(create\s*(a\s*)?task\s*(to\s*)?|remind\s*me\s*to\s*|add\s*task\s*)/i, '')
          .trim();

        const priority = /urgent|critical|asap/i.test(message) ? 'Urgent' : /high|important/i.test(message) ? 'High' : 'Medium';

        // Due date detection
        let dueDate = new Date();
        if (/tomorrow/i.test(message)) {
          dueDate.setDate(dueDate.getDate() + 1);
        } else if (/next week/i.test(message)) {
          dueDate.setDate(dueDate.getDate() + 7);
        } else {
          dueDate.setDate(dueDate.getDate() + 2);
        }

        const taskData = {
          title: cleanTitle.length > 5 ? cleanTitle : 'Complete scheduled task',
          description: `Generated via LifePilot Unified Assistant: "${message}"`,
          priority,
          dueDate: dueDate.toISOString(),
          estimatedDuration: '2 hours',
          originType: 'AI_ASSISTANT'
        };

        structuredData = { task: taskData };
        actionSuggested = 'CREATE_TASKS';
        responseContent = `I have drafted a new task for you:\n\n- **Task:** ${taskData.title}\n- **Priority:** ${taskData.priority}\n- **Estimated Due Date:** ${dueDate.toLocaleDateString()}\n\nWould you like me to add this to your **Central Task Manager**? Click **"Approve & Add Task"** below.`;
        break;
      }

      default: {
        // GENERAL query
        const chatRes = await aiProvider.generateChat([
          { role: 'system', content: `You are LifePilot AI — a helpful, intelligent personal copilot for travel planning, project execution, task management, and document understanding. Be warm, structured, and informative.` },
          { role: 'user', content: message }
        ]);

        responseContent = chatRes.content;
        isDemoOutput = chatRes.isDemoOutput;
        provider = chatRes.provider;
        break;
      }
    }

    return {
      intent,
      classification,
      content: responseContent,
      structuredData,
      actionSuggested,
      isDemoOutput,
      provider
    };
  }
}

module.exports = new Orchestrator();

