const aiProvider = require('./aiProvider');
const promptTemplates = require('./promptTemplates');

class IntentClassifier {
  /**
   * Fast rule-based heuristic classifier used as baseline / fallback
   */
  heuristicClassify(text) {
    const lower = text.toLowerCase();

    // Travel triggers
    const travelWords = [
      'trip', 'travel', 'vacation', 'holiday', 'itinerary', 'hotel', 'flight', 'flight',
      'visit', 'goa', 'manali', 'paris', 'tour', 'explore', 'beach', 'packing', 'journey'
    ];
    // Project triggers
    const projectWords = [
      'project', 'website', 'build', 'develop', 'roadmap', 'milestone', 'college project',
      'hackathon', 'software', 'app', 'system', 'workflow', 'kanban', 'deadline'
    ];
    // Knowledge/Document triggers
    const knowledgeWords = [
      'document', 'pdf', 'docx', 'file', 'summarize', 'extract', 'uploaded', 'notes',
      'report', 'paper', 'contract', 'resume'
    ];
    // Task triggers
    const taskWords = [
      'task', 'todo', 'to-do', 'remind me', 'checklist', 'action item', 'pending tasks'
    ];

    let scores = {
      TRAVEL: 0,
      PROJECT: 0,
      KNOWLEDGE: 0,
      TASK: 0,
      GENERAL: 1
    };

    travelWords.forEach(w => { if (lower.includes(w)) scores.TRAVEL += 2; });
    projectWords.forEach(w => { if (lower.includes(w)) scores.PROJECT += 2; });
    knowledgeWords.forEach(w => { if (lower.includes(w)) scores.KNOWLEDGE += 2; });
    taskWords.forEach(w => { if (lower.includes(w)) scores.TASK += 2; });

    // Find highest
    let topIntent = 'GENERAL';
    let maxScore = 1;
    for (const [intent, score] of Object.entries(scores)) {
      if (score > maxScore) {
        maxScore = score;
        topIntent = intent;
      }
    }

    return {
      intent: topIntent,
      confidence: maxScore > 1 ? 0.85 : 0.6,
      summary: `Classified via intent analysis as ${topIntent}`
    };
  }

  async classify(text) {
    if (!text || typeof text !== 'string') {
      return { intent: 'GENERAL', confidence: 0.5 };
    }

    // High confidence keyword match returns instantly without adding network latency
    const heuristic = this.heuristicClassify(text);
    if (heuristic.confidence >= 0.85) {
      return heuristic;
    }

    const activeProvider = aiProvider.getActiveProvider();

    // If demo mode, use heuristic
    if (activeProvider === 'demo') {
      return heuristic;
    }

    try {
      const messages = [
        { role: 'system', content: promptTemplates.INTENT_CLASSIFICATION },
        { role: 'user', content: text }
      ];

      const res = await aiProvider.generateChat(messages, { temperature: 0.1, json: true });
      const parsed = aiProvider.safeParseJson(res.content);

      if (parsed && parsed.intent) {
        return {
          intent: parsed.intent,
          confidence: parsed.confidence || 0.9,
          summary: parsed.summary || '',
          extractedEntities: parsed.extractedEntities || {}
        };
      }
      return this.heuristicClassify(text);
    } catch (err) {
      console.warn('[IntentClassifier] AI classification failed, using heuristic:', err.message);
      return this.heuristicClassify(text);
    }
  }
}

module.exports = new IntentClassifier();

