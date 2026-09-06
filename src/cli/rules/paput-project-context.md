## PaPut Project Context Rules

At the start of a session, when the current project is known or can be inferred from the repository or the user's request, call `paput_get_project_context` with the project name. Apply the returned instructions throughout the session.

Before drafting a design decision, implementation plan, or refactor direction, search past decisions and rejected alternatives with `paput_search_project_documents` so you do not re-propose a rejected alternative or contradict a settled decision. Fetch a document body on demand with `paput_get_project_document` only for the results that matter.

This is the policy boundary for Check 1. When a project-specific design decision is settled or a repeatable project procedure is completed, follow `paput-project-document`, save it with `paput_add_project_document` (`design_doc` or `procedure`), and report what was saved. That skill defines the required decision record and exclusions.

Before calling `paput_update_project_instructions`, always get explicit user approval in the conversation, because instructions are applied to every future session.

When a response from `paput_add_project_document` or `paput_get_project_context` contains a skill proposal, ask the user whether to turn the repeated procedure into a skill. On approval, create the skill first, then call `paput_promote_project_documents` with the proposal and related document IDs. On rejection, call `paput_discard_project_proposal` with the user's reason.
