---
name: codestral
description: >-
  Query Mistral Codestral directly via /codestral for specialized coding, refactoring, or code review.
---

# Codestral (Mistral AI Coding Assistant)

When this skill or slash command (/codestral) is invoked by the user:

1. **Execute Prompt**: Automatically query the mistral provider using the internal query runner:
   
ode vault/query.js --provider mistral --prompt "<USER_PROMPT>"
   or the MCP tool.
2. **Attribution**: Format the output clearly under the header:
   ### ?? Codestral (Mistral) Response
3. **Integration**: If the user asked for code, refactoring, or bug fixes, immediately review the generated code and apply it to the relevant project files.
