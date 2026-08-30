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

async function callProvider(provider, model, prompt) {
  const urlMap = {
    groq: { url: 'https://api.groq.com/openai/v1/chat/completions', key: process.env.GROQ_API_KEY, model: model || 'openai/gpt-oss-120b' },
    mistral: { url: 'https://api.mistral.ai/v1/chat/completions', key: process.env.MISTRAL_API_KEY, model: model || 'codestral-latest' },
    gemini: { url: `https://generativelanguage.googleapis.com/v1beta/models/${model || 'gemini-2.5-flash'}:generateContent?key=${process.env.GEMINI_API_KEY}`, key: process.env.GEMINI_API_KEY, isGemini: true }
  };

  const target = urlMap[provider];
  if (!target || !target.key) return `[${provider} skipped: key not found]`;

  try {
    if (target.isGemini) {
      const payload = JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] });
      const res = await makePost(new URL(target.url), { 'Content-Type': 'application/json' }, payload);
      const data = JSON.parse(res);
      return data.candidates?.[0]?.content?.parts?.[0]?.text || JSON.stringify(data);
    } else {
      const payload = JSON.stringify({ model: target.model, messages: [{ role: 'user', content: prompt }] });
      const res = await makePost(new URL(target.url), { 'Content-Type': 'application/json', 'Authorization': `Bearer ${target.key}` }, payload);
      const data = JSON.parse(res);
      return data.choices?.[0]?.message?.content || JSON.stringify(data);
    }
  } catch (err) {
    return `[Error querying ${provider}: ${err.message}]`;
  }
}

function makePost(url, headers, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(url, { method: 'POST', headers }, res => {
      let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(d));
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

async function run() {
  const prompt = process.argv.slice(2).join(' ') || 'Explain polymorphism in 2 sentences.';
  console.log(`\n?? Running Multi-Model Arena on prompt: "${prompt}"\n`);

  const [groqRes, mistralRes, geminiRes] = await Promise.all([
    callProvider('groq', null, prompt),
    callProvider('mistral', null, prompt),
    callProvider('gemini', null, prompt)
  ]);

  console.log('=== ? Groq (GPT-OSS 120B) ===\n' + groqRes.trim() + '\n');
  console.log('=== ?? Mistral (Codestral) ===\n' + mistralRes.trim() + '\n');
  console.log('=== ?? Google AI Studio (Gemini 2.5 Flash) ===\n' + geminiRes.trim() + '\n');
}

run();
