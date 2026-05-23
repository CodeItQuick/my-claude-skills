# Few-shot

Provide 2–5 input/output examples before the real request.

**Use when:** the output must match a specific format, tone, or style that is hard to describe in words.

**Gap it fixes:** format drift, inconsistent tone, the model guessing what "good" looks like.

**Example:**
```
Input: "I can't get this to work" → Output: Bug report
Input: "How do I install X?" → Output: Question
Input: {user_message} → Output:
```