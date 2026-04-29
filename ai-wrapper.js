// ═══════════════════════════════════════════════════════════════
// AI API WRAPPER — Multi-Platform Support
// Supports: Claude, OpenAI, Gemini, DeepSeek, Kimi, Groq,
//           Mistral, xAI/Grok, Cohere, Together, Fireworks,
//           NVIDIA, Ollama (local), OpenRouter, Perplexity
// Usage: const ai = require('./ai-wrapper');
//        const reply = await ai.chat("Hello!");
// ═══════════════════════════════════════════════════════════════

const https = require('https');
const http  = require('http');

// ── PROVIDER CONFIGS ────────────────────────────────────────────
const PROVIDERS = {

  // 1. Anthropic Claude
  claude: {
    hostname : 'api.anthropic.com',
    path     : '/v1/messages',
    authHeader: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    defaultModel: 'claude-sonnet-4-6',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      max_tokens : opts.maxTokens || 1024,
      temperature: opts.temperature ?? 0.7,
      messages,
    }),
    parseResponse: (data) => data.content?.[0]?.text,
  },

  // 2. OpenAI
  openai: {
    hostname : 'api.openai.com',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'gpt-4o',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 3. Google Gemini
  gemini: {
    hostname : 'generativelanguage.googleapis.com',
    getPath  : (model, key) => `/v1beta/models/${model}:generateContent?key=${key}`,
    authHeader: () => ({}), // key in URL
    defaultModel: 'gemini-2.0-flash',
    buildBody: (model, messages, opts) => {
      const contents = messages.map(m => ({
        role : m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));
      return JSON.stringify({
        contents,
        generationConfig: {
          temperature : opts.temperature ?? 0.7,
          maxOutputTokens: opts.maxTokens || 1024,
        },
      });
    },
    parseResponse: (data) => data.candidates?.[0]?.content?.parts?.[0]?.text,
  },

  // 4. DeepSeek
  deepseek: {
    hostname : 'api.deepseek.com',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'deepseek-chat',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 5. Kimi (Moonshot AI)
  kimi: {
    hostname : 'api.moonshot.cn',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'moonshot-v1-8k',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 6. Groq (ultra fast)
  groq: {
    hostname : 'api.groq.com',
    path     : '/openai/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'llama-3.3-70b-versatile',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 7. Mistral AI
  mistral: {
    hostname : 'api.mistral.ai',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'mistral-large-latest',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 8. xAI Grok
  xai: {
    hostname : 'api.x.ai',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'grok-3-fast',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 9. Cohere
  cohere: {
    hostname : 'api.cohere.ai',
    path     : '/v2/chat',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'command-r-plus',
    buildBody: (model, messages, opts) => {
      const last    = messages[messages.length - 1];
      const history = messages.slice(0, -1).map(m => ({
        role   : m.role === 'assistant' ? 'CHATBOT' : 'USER',
        message: m.content,
      }));
      return JSON.stringify({
        model,
        message        : last.content,
        chat_history   : history,
        max_tokens     : opts.maxTokens || 1024,
        temperature    : opts.temperature ?? 0.7,
      });
    },
    parseResponse: (data) => data.message?.content?.[0]?.text || data.text,
  },

  // 10. Together AI
  together: {
    hostname : 'api.together.xyz',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'meta-llama/Llama-3-70b-chat-hf',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 11. Fireworks AI
  fireworks: {
    hostname : 'api.fireworks.ai',
    path     : '/inference/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'accounts/fireworks/models/llama-v3p1-70b-instruct',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 12. NVIDIA NIM
  nvidia: {
    hostname : 'integrate.api.nvidia.com',
    path     : '/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'meta/llama-3.1-70b-instruct',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 13. OpenRouter (150+ models via one API)
  openrouter: {
    hostname : 'openrouter.ai',
    path     : '/api/v1/chat/completions',
    authHeader: (key) => ({
      'Authorization' : `Bearer ${key}`,
      'HTTP-Referer'  : 'https://linkedflow.ai',
      'X-Title'       : 'LinkedFlow AI',
    }),
    defaultModel: 'openai/gpt-4o',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 14. Perplexity (with web search)
  perplexity: {
    hostname : 'api.perplexity.ai',
    path     : '/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'sonar-pro',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },

  // 15. Ollama (local, self-hosted)
  ollama: {
    hostname : 'localhost',
    port     : 11434,
    path     : '/api/chat',
    protocol : 'http',
    authHeader: () => ({}),
    defaultModel: 'llama3',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      messages,
      stream : false,
      options: {
        temperature: opts.temperature ?? 0.7,
        num_predict: opts.maxTokens || 1024,
      },
    }),
    parseResponse: (data) => data.message?.content,
  },

  // 16. Qwen (Alibaba)
  qwen: {
    hostname : 'dashscope.aliyuncs.com',
    path     : '/compatible-mode/v1/chat/completions',
    authHeader: (key) => ({ 'Authorization': `Bearer ${key}` }),
    defaultModel: 'qwen-max',
    buildBody: (model, messages, opts) => JSON.stringify({
      model,
      temperature: opts.temperature ?? 0.7,
      max_tokens : opts.maxTokens || 1024,
      messages,
    }),
    parseResponse: (data) => data.choices?.[0]?.message?.content,
  },
};

// ── CUSTOM PROVIDER SUPPORT ─────────────────────────────────────
// Add your own provider like this:
// AIWrapper.addProvider('myprovider', { hostname, path, authHeader, defaultModel, buildBody, parseResponse });
const customProviders = {};

// ── HTTP REQUEST ────────────────────────────────────────────────
function makeRequest(options, body) {
  return new Promise((resolve, reject) => {
    const lib = options.protocol === 'http' ? http : https;
    const req = lib.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode >= 400) {
            reject(new Error(`[${options.hostname}] HTTP ${res.statusCode}: ${JSON.stringify(parsed)}`));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error(`Failed to parse response: ${data}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ── MAIN CHAT FUNCTION ──────────────────────────────────────────
async function chat(prompt, options = {}) {
  const providerName = options.provider || process.env.AI_PROVIDER || 'claude';
  const allProviders = { ...PROVIDERS, ...customProviders };
  const provider     = allProviders[providerName];

  if (!provider) {
    throw new Error(`Unknown provider: "${providerName}". Available: ${Object.keys(allProviders).join(', ')}`);
  }

  // Get API key
  const envKeyMap = {
    claude     : 'ANTHROPIC_API_KEY',
    openai     : 'OPENAI_API_KEY',
    gemini     : 'GEMINI_API_KEY',
    deepseek   : 'DEEPSEEK_API_KEY',
    kimi       : 'KIMI_API_KEY',
    groq       : 'GROQ_API_KEY',
    mistral    : 'MISTRAL_API_KEY',
    xai        : 'XAI_API_KEY',
    cohere     : 'COHERE_API_KEY',
    together   : 'TOGETHER_API_KEY',
    fireworks  : 'FIREWORKS_API_KEY',
    nvidia     : 'NVIDIA_API_KEY',
    openrouter : 'OPENROUTER_API_KEY',
    perplexity : 'PERPLEXITY_API_KEY',
    ollama     : null, // no key needed
    qwen       : 'QWEN_API_KEY',
  };

  const keyEnvVar = options.apiKeyEnv || envKeyMap[providerName];
  const apiKey    = options.apiKey || (keyEnvVar ? process.env[keyEnvVar] : null);

  if (keyEnvVar && !apiKey) {
    throw new Error(`API key missing! Set ${keyEnvVar} in .env or pass apiKey in options.`);
  }

  // Build messages array
  const messages = options.messages || [
    ...(options.systemPrompt ? [{ role: 'user', content: options.systemPrompt }, { role: 'assistant', content: 'Understood.' }] : []),
    { role: 'user', content: prompt },
  ];

  const model = options.model || provider.defaultModel;
  const body  = provider.buildBody(model, messages, options);

  // Build path (Gemini needs key in URL)
  const path = provider.getPath
    ? provider.getPath(model, apiKey)
    : provider.path;

  const reqOptions = {
    hostname: provider.hostname,
    port    : provider.port || (provider.protocol === 'http' ? 80 : 443),
    path,
    method  : 'POST',
    protocol: provider.protocol || 'https:',
    headers : {
      'Content-Type'  : 'application/json',
      'Content-Length': Buffer.byteLength(body),
      ...provider.authHeader(apiKey),
    },
  };

  const response = await makeRequest(reqOptions, body);
  const text     = provider.parseResponse(response);

  if (!text) throw new Error(`Empty response from ${providerName}: ${JSON.stringify(response)}`);
  return text;
}

// ── RETRY WITH FALLBACK ─────────────────────────────────────────
async function chatWithFallback(prompt, providerList, options = {}) {
  for (const providerName of providerList) {
    try {
      console.log(`🤖 Trying provider: ${providerName}`);
      const result = await chat(prompt, { ...options, provider: providerName });
      console.log(`✅ Success with: ${providerName}`);
      return result;
    } catch (err) {
      console.error(`❌ ${providerName} failed: ${err.message}`);
    }
  }
  throw new Error('All providers failed!');
}

// ── ADD CUSTOM PROVIDER ─────────────────────────────────────────
function addProvider(name, config) {
  customProviders[name] = config;
  console.log(`✅ Custom provider "${name}" added.`);
}

// ── LIST PROVIDERS ──────────────────────────────────────────────
function listProviders() {
  const all = { ...PROVIDERS, ...customProviders };
  return Object.entries(all).map(([name, p]) => ({
    name,
    defaultModel: p.defaultModel,
    isCustom    : !!customProviders[name],
  }));
}

// ── EXPORTS ─────────────────────────────────────────────────────
module.exports = {
  chat,
  chatWithFallback,
  addProvider,
  listProviders,
  PROVIDERS,
};

// ── DIRECT RUN TEST ─────────────────────────────────────────────
if (require.main === module) {
  (async () => {
    console.log('\n📋 Available Providers:');
    listProviders().forEach(p => console.log(`  - ${p.name} (${p.defaultModel})`));

    console.log('\n🧪 Testing with provider from .env (AI_PROVIDER)...');
    try {
      require('dotenv').config();
      const reply = await chat('Say hello in one sentence.', { temperature: 0.5 });
      console.log('✅ Response:', reply);
    } catch (err) {
      console.error('❌ Test failed:', err.message);
    }
  })();
}
