---
name: groq
description: >-
  Query Groq via /groq for ultra-fast LPU inference (GPT-OSS 120B / Qwen) and instant brainstorming.
---

# Groq Fast Inference

When this skill or slash command (/groq) is invoked by the user:

1. **Execute Prompt**: Automatically query the groq provider using the internal query runner:
   
ode vault/query.js --provider groq --prompt "<USER_PROMPT>"
   or the MCP tool.
2. **Attribution**: Format the output clearly under the header:
   ### ? Groq Response
3. **Integration**: If the user asked for code, refactoring, or bug fixes, immediately review the generated code and apply it to the relevant project files.
