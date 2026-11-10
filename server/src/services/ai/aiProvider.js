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

    // Auto resolution: prefer Gemini if configured since it provides validated live models
    if (this.geminiKey) return 'gemini';
    if (this.bharatCodeKey) return 'bharatcode';
    return 'demo';
  }

  async generateChat(messages, options = {}) {
    const active = this.getActiveProvider();

    if (active === 'gemini') {
      try {
        return await this.callGemini(messages, options);
      } catch (err) {
        console.warn('[AIProvider] Gemini failed, falling back to BharatCode or Demo:', err.message);
        if (this.bharatCodeKey) {
          try {
            return await this.callBharatCode(messages, options);
          } catch (bcErr) {
            console.warn('[AIProvider] BharatCode fallback failed:', bcErr.message);
          }
        }
        return this.generateDemoChat(messages, options);
      }
    }

    if (active === 'bharatcode') {
      try {
        return await this.callBharatCode(messages, options);
      } catch (err) {
        console.warn('[AIProvider] BharatCode failed, falling back to Gemini or Demo:', err.message);
        if (this.geminiKey) {
          try {
            return await this.callGemini(messages, options);
          } catch (geminiErr) {
            console.warn('[AIProvider] Gemini fallback failed:', geminiErr.message);
          }
        }
        return this.generateDemoChat(messages, options);
      }
    }

    return this.generateDemoChat(messages, options);
  }

  async callBharatCode(messages, options = {}) {
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
        timeout: 10000
      }
    );

    const content = response.data?.choices?.[0]?.message?.content || '';
    return {
      content,
      provider: 'bharatcode',
      isDemoOutput: false
    };
  }

  async callGemini(messages, options = {}) {
    // Transform OpenAI-style messages to Gemini contents format
    const contents = messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));

    if (contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: 'Hello' }] });
    }

    const systemMsg = messages.find(m => m.role === 'system');
    const systemInstruction = systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined;

    const candidateModels = options.model 
      ? [options.model] 
      : ['gemini-3.5-flash-lite', 'gemini-3.8-flash', 'gemini-3.5-flash'];

    const generationConfig = {
      temperature: options.temperature !== undefined ? options.temperature : 0.7,
      maxOutputTokens: options.max_tokens || 2048
    };

    if (options.json) {
      generationConfig.responseMimeType = 'application/json';
    }

    const body = {
      contents,
      generationConfig
    };
    if (systemInstruction) body.systemInstruction = systemInstruction;

    let lastError = null;
    for (const modelName of candidateModels) {
      try {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${this.geminiKey}`;
        const res = await axios.post(url, body, {
          headers: { 'Content-Type': 'application/json' },
          timeout: 10000
        });

        const candidate = res.data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text || '';

        return {
          content: text,
          provider: `gemini (${modelName})`,
          isDemoOutput: false
        };
      } catch (err) {
        lastError = err;
        console.warn(`[AIProvider] Gemini model ${modelName} failed (${err.response?.status || err.message}), trying fallback model...`);
      }
    }

    throw lastError || new Error('All Gemini candidate models failed.');
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
      const match = raw ? raw.match(/(\{[\s\S]*\}|\[[\s\S]*\])/) : null;
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

