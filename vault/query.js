const https = require('https');
const fs = require('fs');
const path = require('path');

function loadEnv() {
  const paths = [
    path.join(__dirname, '..', '.env.local'),
    path.join(__dirname, '..', '.env'),
    path.join(process.env.USERPROFILE || process.env.HOME || '', '.env')
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) {
      const lines = fs.readFileSync(p, 'utf8').split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const [k, ...v] = trimmed.split('=');
        if (k && v) process.env[k.trim()] = v.join('=').trim();
      }
    }
  }
}

loadEnv();

const PROVIDERS = {
  nvidia: {
    name: 'NVIDIA NIM',
    url: 'https://integrate.api.nvidia.com/v1/chat/completions',
    key: () => process.env.NVIDIA_API_KEY,
    defaultModel: 'meta/llama-3.2-11b-vision-instruct',
    format: 'openai'
  },
  openrouter: {
    name: 'OpenRouter',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    key: () => process.env.OPENROUTER_API_KEY,
    defaultModel: 'nvidia/nemotron-3.5-lightning:free',
    format: 'openai'
  },
  groq: {
    name: 'GroqCloud',
    url: 'https://api.groq.com/openai/v1/chat/completions',
    key: () => process.env.GROQ_API_KEY,
    defaultModel: 'openai/gpt-oss-120b',
    format: 'openai'
  },
  mistral: {
    name: 'Mistral AI',
    url: 'https://api.mistral.ai/v1/chat/completions',
    key: () => process.env.MISTRAL_API_KEY,
    defaultModel: 'codestral-latest',
    format: 'openai'
  },
  gemini: {
    name: 'Google AI Studio (Gemini)',
    url: (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`,
    key: () => process.env.GEMINI_API_KEY,
    defaultModel: 'gemini-2.5-flash',
    format: 'gemini'
  }
};

async function queryModel({ provider = 'groq', model, prompt }) {
  const pConfig = PROVIDERS[provider.toLowerCase()];
  if (!pConfig) {
    console.error(`Unknown provider: ${provider}. Available: ${Object.keys(PROVIDERS).join(', ')}`);
    process.exit(1);
  }

  const selectedModel = model || pConfig.defaultModel;
  const apiKey = pConfig.key();

  if (!apiKey) {
    console.error(`Error: Missing API key for ${pConfig.name}. Please check your .env file.`);
    process.exit(1);
  }

  console.log(`\nConnecting to [${pConfig.name}] | Model: [${selectedModel}]`);
  console.log(`Prompt: "${prompt}"\n--- Response ---`);

  if (pConfig.format === 'gemini') {
    const url = new URL(pConfig.url(selectedModel));
    const payload = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }]
    });

    const res = await makePostRequest(url, { 'Content-Type': 'application/json' }, payload);
    const data = JSON.parse(res);
    if (data.candidates && data.candidates[0]) {
      console.log(data.candidates[0].content.parts[0].text);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } else {
    const url = new URL(pConfig.url);
    const payload = JSON.stringify({
      model: selectedModel,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    };
    if (provider.toLowerCase() === 'openrouter') {
      headers['HTTP-Referer'] = 'http://localhost:3000';
      headers['X-Title'] = 'BandMate';
    }

    const res = await makePostRequest(url, headers, payload);
    const data = JSON.parse(res);
    if (data.choices && data.choices[0]) {
      console.log(data.choices[0].message.content);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  }
}

function makePostRequest(url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

const args = process.argv.slice(2);
let provider = 'groq';
let model = null;
let prompt = 'In 5 words introduce yourself';

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--provider' || args[i] === '-p') provider = args[++i];
  else if (args[i] === '--model' || args[i] === '-m') model = args[++i];
  else if (args[i] === '--prompt') prompt = args[++i];
}

queryModel({ provider, model, prompt }).catch(err => console.error('Error:', err.message));
