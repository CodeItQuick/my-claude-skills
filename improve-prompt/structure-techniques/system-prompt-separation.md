# System prompt separation

Move stable instructions (persona, format, constraints) to the system prompt; keep the user turn focused on the current task.

**Use when:** the same instructions are being repeated in every user message.

**Gap it fixes:** bloated user messages, inconsistent instruction application across turns.

**Example:** Move `You are a helpful assistant who always responds in bullet points` to the system prompt.