## PaPut Completion Checklist

Before the final message of a work turn, run both checks below in this order. They are independent: completing or finding nothing in one never substitutes for the other.

Skill naming: these rules refer to PaPut skills by their standalone names (`paput-capture`, `paput-save`, `paput-harvest`, `paput-project-document`, ...). When PaPut is installed as a plugin instead, the same skills live under the `paput` namespace — read `paput-<name>` as `paput:<name>` (e.g. `paput-capture` → `/paput:capture`). Every rule below applies to whichever form is installed.

- [ ] Check 1 — Project document: did the work settle a project-specific design decision or repeatable project procedure? If so, follow `paput-project-document`, save it with `paput_add_project_document`, and report what was saved. Otherwise report `Check 1: no project document needed`.
- [ ] Check 2 — Reusable knowledge: did reusable cross-project knowledge appear? If so, follow `paput-capture` and report its title, categories, and candidate ID. Otherwise report `Check 2: no reusable knowledge found`.
- [ ] Conditional session marker — this is not a third check. Unless a capture registered candidates in this session or it was already marked, call `paput_mark_processed_sessions` with the current session as a one-element `sessions` array. Resolve its real identity as `paput-capture` specifies (Claude's 36-character UUID; Codex's rollout basename from `CODEX_THREAD_ID`). Do not mark a spawned agent, teammate, or `codex exec` run; its parent owns the checklist. If marking fails, note it and continue. Mention the marker only when it acted.

State one short outcome for each check; never leave either silent. The detailed procedures are in the named skills and the following rules.
