# Self-consistency

Generate multiple independent answers to the same question, then take the most common or synthesize.

**Use when:** the task has a definite correct answer but the model might err on any single attempt (math, fact recall).

**Gap it fixes:** single-path errors that would be caught by looking at multiple attempts.

**Example:** `Answer this question three times independently, then give your final answer based on where the answers agree.`