# Chain-of-thought (CoT)

Ask the model to reason step by step before producing the final answer.

**Use when:** the task involves multi-step reasoning, math, logic, or decisions where intermediate steps matter.

**Gap it fixes:** the model jumping to a conclusion that skips necessary reasoning.

**Example:** Append `Think step by step before answering. Show each step on a new line; state your conclusion only after completing all steps.` or show reasoning in few-shot examples.