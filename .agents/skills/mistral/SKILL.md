---
name: mistral
description: >-
  Query Mistral AI directly via /mistral for coding, reasoning, refactoring, or code review.
---

# Mistral AI Assistant

When this skill or slash command (/mistral) is invoked by the user:

1. **Execute Prompt**: Automatically query the mistral provider using the internal query runner:
   `node vault/query.js --provider mistral --prompt "<USER_PROMPT>"`
   or the MCP tool `ask_codestral`.
2. **Attribution**: Format the output clearly under the header:
   ### ⚡ Mistral AI Response
3. **Integration**: If the user asked for code, refactoring, or bug fixes, immediately review the generated code and apply it to the relevant project files.
