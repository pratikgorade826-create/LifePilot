const axios = require('axios');
const env = require('../../config/env');

class AIProvider {
  constructor() {
    this.provider = env.AI_PROVIDER || 'auto';
    this.bharatCodeKey = env.BHARATCODE_API_KEY;
    this.bharatCodeUrl = env.BHARATCODE_BASE_URL || 'https://api.bharatcode.org/v1';
    this.geminiKey = env.GEMINI_API_KEY;
  }

  getActiveProvider() {
    if (this.provider === 'bharatcode' && this.bharatCodeKey) return 'bharatcode';
    if (this.provider === 'gemini' && this.geminiKey) return 'gemini';
    if (this.provider === 'demo') return 'demo';

    // Auto resolution
    if (this.bharatCodeKey) return 'bharatcode';
    if (this.geminiKey) return 'gemini';
    return 'demo';
  }

  async generateChat(messages, options = {}) {
    const active = this.getActiveProvider();

    if (active === 'bharatcode') {
      try {
        const response = await axios.post(
          `${this.bharatCodeUrl}/chat/completions`,
          {
            model: options.model || 'bharatcode-1.0',
            messages,
            temperature: options.temperature || 0.7,
            max_tokens: options.max_tokens || 2048
          },
          {
            headers: {
              'Authorization': `Bearer ${this.bharatCodeKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 30000
          }
        );

        const content = response.data?.choices?.[0]?.message?.content || '';
        return {
          content,
          provider: 'bharatcode',
          isDemoOutput: false
        };
      } catch (err) {
        console.warn('[AIProvider] BharatCode failed, falling back to Gemini or Demo:', err.message);
        if (this.geminiKey) return this.callGemini(messages, options);
        return this.generateDemoChat(messages, options);
      }
    }

    if (active === 'gemini') {
      try {
        return await this.callGemini(messages, options);
      } catch (err) {
        console.warn('[AIProvider] Gemini failed, falling back to Demo:', err.message);
        return this.generateDemoChat(messages, options);
      }
    }

    return this.generateDemoChat(messages, options);
  }

  async callGemini(messages, options = {}) {
    // Transform OpenAI-style messages to Gemini contents format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    const systemMsg = messages.find(m => m.role === 'system');
    const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;

    const candidateModels = ['gemini-3.5-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash'];
    let lastErr = null;

    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.geminiKey}`;
        const body = {
          contents,
          generationConfig: {
            temperature: options.temperature || 0.7,
            maxOutputTokens: options.max_tokens || 2048
          }
        };
        if (systemInstruction) body.systemInstruction = systemInstruction;

        const res = await axios.post(url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 25000
        });

        const candidate = res.data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';

        return {
          content: text,
          provider: 'gemini',
          model: modelName,
          isDemoOutput: false
        };
      } catch (err) {
        lastErr = err;
        console.warn(`[AIProvider] Gemini model ${modelName} failed (${err.response?.status || err.message}), trying next candidate...`);
      }
    }

    throw lastErr || new Error('All Gemini models failed.');
  }

  async generateDemoChat(messages, options = {}) {
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')?.content || '';
    return {
      content: `[DEMO MODE – Active AI key not detected. Showing sample response]\n\nI have received your request: "${lastUserMessage}".\n\nLifePilot AI is ready to organize your trips, build milestone roadmaps, manage your tasks, and extract deep insights from your documents.`,
      provider: 'demo-mode',
      isDemoOutput: true
    };
  }

  cleanJsonString(raw) {
    if (!raw) return '';
    // Strip markdown code fences
    let cleaned = raw.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }
    return cleaned.trim();
  }

  safeParseJson(raw, fallback = null) {
    try {
      const cleaned = this.cleanJsonString(raw);
      return JSON.parse(cleaned);
    } catch (e) {
      // Attempt regex extract { ... } or [ ... ]
      const match = raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) {
        try {
          return JSON.parse(match[0]);
        } catch (inner) {
          // ignore
        }
      }
      return fallback;
    }
  }
}

module.exports = new AIProvider();

