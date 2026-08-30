---
name: openrouter
description: >-
  Query OpenRouter via /openrouter to access open-source models (Nemotron, Cohere, Minimax).
---

# OpenRouter Multi-Model

When this skill or slash command (/openrouter) is invoked by the user:

1. **Execute Prompt**: Automatically query the openrouter provider using the internal query runner:
   
ode vault/query.js --provider openrouter --prompt "<USER_PROMPT>"
   or the MCP tool.
2. **Attribution**: Format the output clearly under the header:
   ### ?? OpenRouter Response
3. **Integration**: If the user asked for code, refactoring, or bug fixes, immediately review the generated code and apply it to the relevant project files.
