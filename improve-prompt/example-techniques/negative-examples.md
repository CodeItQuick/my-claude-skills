# Negative examples

Show what the output should NOT look like alongside positive examples.

**Use when:** few-shot examples alone don't prevent a specific failure mode you've observed.

**Gap it fixes:** the model producing output that matches the letter of the positive examples but misses the spirit.

**Example:**
```
Good: [example of correct output]
Bad (do not do this): [example of the failure mode]
```