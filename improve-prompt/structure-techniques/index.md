# Structure, Framing, and Output Techniques — Index

Use these to shape how the model frames its role, what it outputs, and how verbosely it expresses its instructions. Applicable to most task types.

Load the individual files from this folder based on what applies:

| Technique | When to reach for it | File |
|---|---|---|
| Instruction compression | System prompt or instructions are verbose or repetitive | `instruction-compression.md` |
| Constraint specification | Length, format, audience, or tone are left implicit | `constraint-specification.md` |
| Structured output | Output will be parsed or fed into another system | `structured-output.md` |
| Role prompting | Task benefits from a domain-expert perspective or specific lens | `role-prompting.md` |
| Meta-prompting | User doesn't know what information the model needs to do the task | `meta-prompting.md` |
| Emotional / contextual anchoring | Output is correct but shallow; thoroughness matters | `emotional-anchoring.md` |
| System prompt separation | Same instructions repeated in every user message | `system-prompt-separation.md` |