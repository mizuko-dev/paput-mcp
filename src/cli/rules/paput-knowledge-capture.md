## PaPut Knowledge Capture Rules

This is the policy boundary for Check 2. When reusable cross-project knowledge appears, follow `paput-capture`; that skill contains the evaluation procedure.

Route each item correctly: reusable cross-project knowledge goes to the `paput-capture` workflow; project-specific design decisions and repeatable procedures go to `paput_add_project_document` (Check 1).

Before adding to pending, use `paput-capture` in the current turn. It requires its instructions, capture-policy and existing-pending review, quality bar, and duplicate search of semantically similar memos. Do not call `paput_add_knowledge_candidates` directly without that workflow.

Only keep technical knowledge, decision criteria, and procedures that can be reused in other projects. Do not keep project-specific specifications, implementation details, operational rules, code, secrets, or customer data.

Classify candidates with `memo_type_keys`. Add a reusable, non-duplicate, non-sensitive, non-project-specific candidate allowed by the policy to pending without waiting for approval, then report its title, categories, memo type, and candidate ID. For any ambiguous, sensitive, duplicate-prone, too-narrow, or project-specific candidate, present its title, body, categories, and concern, and ask before adding it.

Use `paput_save_pending_candidates` only when the user explicitly approves saving pending candidates to PaPut. Pass the approved candidates as a `candidates` array in a single call.

When the user asks to review pending candidates or save them to PaPut, follow the `paput-save` workflow.
