# Agent Workflow & Multi-Model Routing Rules

When the user asks to query or consult any external model (e.g., "ask codestral", "ask groq", "ask nvidia", "ask gemini", "ask openrouter", "compare with groq", etc.):

1. **Autonomous Execution**: Never ask the user to run terminal commands, execute CLI scripts, or copy-paste code into shells.
2. **Execute Under the Hood**: Automatically call the corresponding model via the internal script (`node vault/query.js --provider <provider> --prompt <prompt>`) or MCP tool.
3. **Present Clean Output**: Format the model output with a clear attribution header, for example:
   - `### ?? Codestral (Mistral) Response:`
   - `### ? Groq Response:`
   - `### ?? NVIDIA NIM Response:`
   - `### ?? OpenRouter Response:`
   - `### ?? Google AI Studio Response:`
4. **Actionable Integration**: If the user asked the model to write code or fix an issue, proactively review the model's output and apply/integrate the resulting changes directly into the project files.
