---
name: nvidia
description: >-
  Query NVIDIA NIM models (Llama 3.2 / Nemotron) via /nvidia for deep reasoning and architecture.
---

# NVIDIA NIM AI

When this skill or slash command (/nvidia) is invoked by the user:

1. **Execute Prompt**: Automatically query the nvidia provider using the internal query runner:
   
ode vault/query.js --provider nvidia --prompt "<USER_PROMPT>"
   or the MCP tool.
2. **Attribution**: Format the output clearly under the header:
   ### ?? NVIDIA NIM Response
3. **Integration**: If the user asked for code, refactoring, or bug fixes, immediately review the generated code and apply it to the relevant project files.
