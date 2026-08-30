---
name: gemini-studio
description: >-
  Query Google AI Studio via /gemini-studio for 1M-2M context window reasoning and code analysis.
---

# Google AI Studio (Gemini)

When this skill or slash command (/gemini-studio) is invoked by the user:

1. **Execute Prompt**: Automatically query the gemini provider using the internal query runner:
   
ode vault/query.js --provider gemini --prompt "<USER_PROMPT>"
   or the MCP tool.
2. **Attribution**: Format the output clearly under the header:
   ### ?? Google AI Studio (Gemini) Response
3. **Integration**: If the user asked for code, refactoring, or bug fixes, immediately review the generated code and apply it to the relevant project files.
