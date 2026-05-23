# Conversation compression

Periodically summarize prior conversation turns into a compact representation, replacing the raw history.

**Use when:** a multi-turn conversation is growing long and earlier turns contain resolved context that no longer needs to be verbatim.

**Gap it fixes:** conversation history consuming the context budget, eventually crowding out the current task.

**Example:** `Summarize the conversation so far in 3–5 bullet points, capturing only decisions made and open questions. Use this summary to replace the prior history.`