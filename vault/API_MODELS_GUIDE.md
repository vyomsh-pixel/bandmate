# 🏛️ AI API & Models Vault Guide

This document maps all **5 verified API keys** to their respective AI providers, models, best use cases, and code examples.

---

## 📊 Quick Reference Table

| # | Provider | Key Prefix | Base URL | Top Recommended Models | Best Use Case |
|---|---|---|---|---|---|
| **1** | **NVIDIA NIM** | `nvapi-...` | `https://integrate.api.nvidia.com/v1` | `deepseek-ai/deepseek-r1`<br>`meta/llama-3.3-70b-instruct`<br>`meta/llama-3.1-405b-instruct`<br>`nvidia/llama-3.1-nemotron-70b-instruct` | **Heavy Reasoning, Complex Architecture, 405B Frontier Models** |
| **2** | **OpenRouter** | `sk-or-v1-...` | `https://openrouter.ai/api/v1` | `deepseek/deepseek-r1:free`<br>`deepseek/deepseek-chat:free`<br>`meta-llama/llama-3.3-70b-instruct:free`<br>`qwen/qwen-2.5-72b-instruct:free` | **Multi-Model Hub, 20+ Free Models, Benchmarking** |
| **3** | **GroqCloud** | `gsk_...` | `https://api.groq.com/openai/v1` | `llama-3.3-70b-versatile`<br>`deepseek-r1-distill-llama-70b`<br>`llama-3.1-8b-instant`<br>`whisper-large-v3` | **Sub-Second Speed, Real-Time Autocomplete, Audio Transcription** |
| **4** | **Google AI Studio** | `AQ...` | `https://generativelanguage.googleapis.com/v1beta` | `gemini-2.5-flash`<br>`gemini-2.0-flash`<br>`gemini-1.5-pro`<br>`text-embedding-004` | **1M–2M Huge Context Window, Multimodal (Images/Video/Audio)** |
| **5** | **Mistral AI** | `1ybVY...` | `https://api.mistral.ai/v1` | `codestral-latest`<br>`mistral-large-latest`<br>`pixtral-large-latest`<br>`mistral-small-latest` | **Specialized Coding (Codestral), European GDPR, Multilingual** |

---

## 1. 🟢 NVIDIA NIM (NVIDIA API Catalog)

* **Account Portal**: [build.nvidia.com](https://build.nvidia.com)
* **Authentication Header**: `Authorization: Bearer nvapi-...`
* **Base URL**: `https://integrate.api.nvidia.com/v1`
* **API Standard**: OpenAI Compatible

### 🎯 Key Models & When to Use Them
1. **`deepseek-ai/deepseek-r1`**:
   * *Use for*: Advanced algorithmic reasoning, complex bug troubleshooting, math, logic-heavy planning.
2. **`meta/llama-3.1-405b-instruct`**:
   * *Use for*: Giant 405-billion parameter frontier intelligence when you need top-tier reasoning.
3. **`meta/llama-3.3-70b-instruct`**:
   * *Use for*: High-speed general coding, refactoring, writing tests, doc generation.
4. **`nvidia/llama-3.1-nemotron-70b-instruct`**:
   * *Use for*: NVIDIA-optimized chat assistant with high accuracy and low hallucination.

### 💻 How to Use (Node.js / Python / cURL)

#### Node.js (OpenAI SDK)
```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.NVIDIA_API_KEY,
  baseURL: "https://integrate.api.nvidia.com/v1"
});

const response = await openai.chat.completions.create({
  model: "deepseek-ai/deepseek-r1",
  messages: [{ role: "user", content: "Optimize this complex TypeScript function..." }]
});
console.log(response.choices[0].message.content);
```

#### cURL
```bash
curl -X POST "https://integrate.api.nvidia.com/v1/chat/completions" \
  -H "Authorization: Bearer $NVIDIA_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-ai/deepseek-r1",
    "messages": [{"role": "user", "content": "Explain React Server Components"}]
  }'
```

---

## 2. 🌐 OpenRouter

* **Account Portal**: [openrouter.ai](https://openrouter.ai)
* **Authentication Header**: `Authorization: Bearer sk-or-v1-...`
* **Base URL**: `https://openrouter.ai/api/v1`
* **API Standard**: OpenAI Compatible

### 🎯 Key Models & When to Use Them
1. **`deepseek/deepseek-r1:free`**:
   * *Use for*: Free DeepSeek R1 reasoning without any subscription costs.
2. **`deepseek/deepseek-chat:free`**:
   * *Use for*: General conversational chatting, code reviews, brainstorming.
3. **`meta-llama/llama-3.3-70b-instruct:free`**:
   * *Use for*: Strong general purpose assistant and refactoring.
4. **`qwen/qwen-2.5-72b-instruct:free`**:
   * *Use for*: Outstanding multilingual programming and structured JSON outputs.

### 💻 How to Use

#### Node.js (OpenAI SDK)
```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: "https://openrouter.ai/api/v1",
  defaultHeaders: {
    "HTTP-Referer": "http://localhost:3000",
    "X-Title": "BandMate App"
  }
});

const response = await openai.chat.completions.create({
  model: "deepseek/deepseek-r1:free",
  messages: [{ role: "user", content: "Analyze this harmony progression..." }]
});
console.log(response.choices[0].message.content);
```

---

## 3. ⚡ GroqCloud

* **Account Portal**: [console.groq.com](https://console.groq.com)
* **Authentication Header**: `Authorization: Bearer gsk_...`
* **Base URL**: `https://api.groq.com/openai/v1`
* **API Standard**: OpenAI Compatible (LPU Inference Engine)

### 🎯 Key Models & When to Use Them
1. **`llama-3.3-70b-versatile`**:
   * *Speed*: ~350 tokens/second.
   * *Use for*: Instant UI responses, chat streaming, quick code feedback.
2. **`deepseek-r1-distill-llama-70b`**:
   * *Speed*: ~280 tokens/second.
   * *Use for*: Ultra-fast step-by-step reasoning and problem solving.
3. **`llama-3.1-8b-instant`**:
   * *Speed*: ~700+ tokens/second.
   * *Use for*: Instant classification, tagging, grammar fixes, sub-second tasks.
4. **`whisper-large-v3`**:
   * *Use for*: Transcribing audio files and microphone inputs to text in milliseconds.

### 💻 How to Use

#### Python
```python
from groq import Groq
import os

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

chat_completion = client.chat.completions.create(
    messages=[{"role": "user", "content": "Explain chord substitutions"}],
    model="llama-3.3-70b-versatile",
)
print(chat_completion.choices[0].message.content)
```

---

## 4. 🔷 Google AI Studio (Gemini)

* **Account Portal**: [aistudio.google.com](https://aistudio.google.com)
* **Authentication**: `?key=AQ...` or `x-goog-api-key: AQ...`
* **Base URL**: `https://generativelanguage.googleapis.com/v1beta`
* **OpenAI-Compatible Base URL**: `https://generativelanguage.googleapis.com/v1beta/openai/`

### 🎯 Key Models & When to Use Them
1. **`gemini-2.5-flash` / `gemini-2.0-flash`**:
   * *Context Window*: 1,000,000 tokens.
   * *Use for*: Analyzing massive multi-file projects, large documentation, audio/video analysis.
2. **`gemini-1.5-pro`**:
   * *Context Window*: 2,000,000 tokens.
   * *Use for*: Ingesting an entire repository codebase in a single prompt for global refactoring.
3. **`text-embedding-004`**:
   * *Use for*: Building semantic search and RAG vector databases.

### 💻 How to Use

#### Node.js (@google/genai or fetch)
```javascript
const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

const response = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contents: [{ parts: [{ text: "Write a guitar chord voicing generator in TypeScript" }] }]
  })
});

const data = await response.json();
console.log(data.candidates[0].content.parts[0].text);
```

---

## 5. 🔶 Mistral AI (La Plateforme)

* **Account Portal**: [console.mistral.ai](https://console.mistral.ai)
* **Authentication Header**: `Authorization: Bearer 1ybVY...`
* **Base URL**: `https://api.mistral.ai/v1`
* **API Standard**: OpenAI Compatible

### 🎯 Key Models & When to Use Them
1. **`codestral-latest` (Codestral 25.01)**:
   * *Use for*: **Dedicated code model**. State-of-the-art fill-in-the-middle (FIM), autocompletion, unit testing, and refactoring across 80+ programming languages.
2. **`mistral-large-latest` (Mistral Large 24.11)**:
   * *Use for*: Flagship frontier model for complex multilingual reasoning and agentic tool-use.
3. **`pixtral-large-latest`**:
   * *Use for*: Multimodal visual reasoning, UI diagram understanding, chart/image inspection.
4. **`mistral-small-latest`**:
   * *Use for*: Fast, low-cost enterprise workflows.

### 💻 How to Use

#### Node.js (@mistralai/mistralai or OpenAI SDK)
```javascript
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.MISTRAL_API_KEY,
  baseURL: "https://api.mistral.ai/v1"
});

const response = await openai.chat.completions.create({
  model: "codestral-latest",
  messages: [{ role: "user", content: "Write a unit test for musical scale transposition." }]
});
console.log(response.choices[0].message.content);
```

---

## 🛠️ Unified Multi-Model Runner Utility

You can query **any** of your 5 APIs using the included Node.js runner:

```bash
# Query NVIDIA DeepSeek R1
node vault/query.js --provider nvidia --model deepseek-ai/deepseek-r1 --prompt "Explain modal interchange"

# Query Groq Llama 3.3 (Blazing fast)
node vault/query.js --provider groq --model llama-3.3-70b-versatile --prompt "Summarize React hooks"

# Query Mistral Codestral
node vault/query.js --provider mistral --model codestral-latest --prompt "Write a debounce helper in TS"

# Query OpenRouter Free DeepSeek
node vault/query.js --provider openrouter --model "deepseek/deepseek-r1:free" --prompt "Solve this puzzle"
```
