---
name: paput-promote
description: Use this to review principle memos and propose promoting the few that need persistent behavior into global Claude/Codex rules or an always-loaded related skill. Trigger when the user asks to make accumulated principles affect future work, review standing rules, or run an initial or incremental promotion sweep; always present a manifest and get explicit approval before writing.
---

# PaPut Promote

Turn selected `principle` memos into a small, reviewable proposal for persistent
instructions. This is the counterpart to `paput-capture`: capture stores reusable
knowledge; promote decides whether a principle should change default agent behavior.

## When To Use

- The user asks to promote, operationalize, or review principle memos.
- The user wants a first sweep of accumulated principles or an incremental sweep
  since the last promotion review.
- A standing rule has become crowded and needs a zero-sum review.

Do not use this to promote `decision` or `operation` memos in v1.

## Locate the Instruction Files

1. Resolve Claude's file as `${CLAUDE_HOME:-~/.claude}/CLAUDE.md` and Codex's
   file as `${CODEX_HOME:-~/.codex}/AGENTS.md`.
2. Read every file that already exists. If both exist, treat their promote blocks
   as one shared rule set and propose identical content for both. If only one
   exists, use only that file. Never create the absent file.
3. Keep promoted rules in a separate, non-nested block:

   ```markdown
   <!-- paput-promote:start -->

   ...approved promoted rules...

   <!-- paput-promote:end -->
   ```

   Place it outside `<!-- paput-mcp:start ... -->` / `<!-- paput-mcp:end -->`.
   Do not write inside, around, or nested with the `setup-ai` managed block.

4. Use exactly one rejection ledger, named `.paput-promote-ledger.json`, beside
   one existing instruction file. If both files exist and no ledger owner has
   been established, continue read-only analysis without one. Before asking for
   approval to write rejected IDs, ask the user which directory owns the ledger;
   then keep using that one ledger and do not create a second ledger beside the
   other file. Store only `last_sweep_at` (the sweep's start time) and rejected
   memo IDs (with their rejection date), not memo bodies. Use this exact shape:

   ```json
   {
     "last_sweep_at": "2026-07-29T01:02:03.000Z",
     "rejected": [{ "memo_id": 963, "rejected_at": "2026-07-29T01:02:03.000Z" }]
   }
   ```

## Build the Proposal

1. Read the existing promote block, every effective rule line in the active
   instruction files, and the single ledger when it exists before selecting
   memos. Treat a rule already represented anywhere in the current instruction
   text as promoted; do not propose it again.
2. Immediately before fetching the index, fix `sweep_started_at`. With no ledger
   or `last_sweep_at`, page through the complete `memo_type: "principle"` index
   for the initial full sweep. On later sweeps, page the index in descending
   update time, inspect entries with `updated_at >= last_sweep_at`, and stop once
   `updated_at < last_sweep_at`. Re-inspect equal timestamps to avoid a boundary
   miss. Exclude previously rejected IDs unless the user explicitly asks to
   reconsider them. On success, persist `sweep_started_at`, not completion time,
   as `last_sweep_at` so changes made during this run are picked up next time.
3. During the initial full sweep, split the complete index into entries with and
   without a summary. Fetch every empty-summary entry's body with
   `paput_search_memo` and `ids`, in necessary batches, and draft one one-line
   summary for each. Reuse those fetched bodies for promotion scoring so no
   empty-summary memo is fetched or read twice in the same run. For entries that
   already have a summary, triage from title and summary and fetch full bodies
   only for likely promotion candidates. Include every proposed summary backfill
   in the approval manifest; do not write it yet.
4. Score every candidate on all three required axes:
   - **Concrete harm:** ignoring it has a meaningful, recurring cost.
   - **Not followed by default:** a capable model will not reliably do it without
     an explicit instruction.
   - **Trigger frequency:** it applies often enough to justify persistent context.
5. Route each memo to exactly one outcome:
   - **Standing rule:** all three axes are strong and the behavior is broadly
     applicable. Reserve this scarce block for roughly 10--20 effective lines.
   - **Always-loaded related skill:** harm and non-default behavior are strong,
     but its trigger is narrower or rarer. Use only an existing skill that
     triggers in every situation where the principle is needed and whose body is
     therefore always loaded there; semantic similarity alone is insufficient.
     Resolve its persistent source-of-truth absolute path. Never use a plugin
     cache, generated output, or a temporary distribution reached through a
     symlink as that source. If no writable persistent source can be resolved,
     mark the proposal blocked and state the path or ownership information the
     user must provide; do not make it a writeable related-skill proposal.
   - **Do not promote:** the model already does it, harm is small, it is too rare,
     it is project-specific, or it duplicates current text.
6. Make the standing-rule proposal zero-sum. Re-evaluate every effective rule
   line in every existing instruction file on the same three axes, not only lines
   in the promote block. Pair every added rule with a specific existing line to
   delete, merge, or shorten, even when the promote block is empty. If a paired
   line is inside a managed block such as `setup-ai` / `paput-mcp`, identify its
   persistent generating source and the official updater command or existing-skill
   procedure that regenerates that block in its active instruction file. Include
   both in the manifest instead of editing managed text. A managed line without
   an identifiable persistent source or safely identified official update path is
   not an actionable counterpart: mark the addition blocked and explain why. Do
   not infer a command or substitute cache editing. If no addition survives, still
   list stale lines that should be removed or say that none qualify.

## Present a Manifest Before Any Write

Show a manifest. Each proposed item must contain all of the following:

- memo ID and title;
- a paste-ready compressed rule of one to three lines;
- destination: standing rule, named related skill, or do not promote;
- the concrete-harm, non-default, and frequency reasons;
- its zero-sum counterpart: the exact current rule line(s) to fold or remove, or
  `none` for a related-skill / no-promotion outcome;
- for a managed zero-sum counterpart, its persistent generating source absolute
  path, official updater command or existing-skill procedure, and active
  instruction file; and for a related-skill destination, the resolved persistent
  source-of-truth absolute path;
- any proposed summary backfill for an empty-summary memo.
- the pre-write recovery copies and recovery sequence for every changed source
  and active instruction file; for a multi-file rule block, its verified
  temporary block content and the rollback that prevents either side remaining
  active alone.

Also list the target instruction file(s), the ledger owner, already-promoted
duplicates, and rejected items with their reasons. When requesting approval to
record no-promotion outcomes in bulk, list every memo ID under each reason; do
not substitute representative IDs. Ask for explicit approval of the specific
manifest items. For a managed counterpart, present promote-block addition,
managed-source edit, and official updater execution as one change set; apply it
only when the user explicitly approves that whole set, including its recovery.
Require the same explicit recovery approval for non-managed and related-skill
writes. A request to "run promotion" authorizes analysis only; it does not
authorize a write.

## Apply Only Approved Items

After the user explicitly approves identified items, apply only those items:

1. Before any write, make byte-for-byte recovery copies in a temporary directory
   of every changed persistent source and active instruction file. When both
   instruction files receive a rule block, prepare and validate their identical
   block content in one temporary file before either replacement.
2. For an approved managed counterpart, edit only its approved persistent source,
   never the managed block body, then run its approved official updater once and
   confirm that the active managed counterpart was shortened. Only after that
   succeeds, publish the promote block. The normal updater limit is one run; an
   approved recovery may run it once more only to regenerate after source restore.
   If the source write, updater, or shortening check fails, restore the source,
   run that one approved recovery updater when necessary, restore the active files
   from their copies, re-read them, and stop without publishing the new block.
   Report partial success only if this recovery fails; otherwise report the
   recovered, unapplied change set.
3. Publish a promote block to the active instruction file(s), preserving all text
   outside that block and leaving managed blocks untouched. After each replacement
   verify byte identity against the prepared block and, when both files are
   targets, against the other active file's block. If either replacement fails or
   differs, do not leave the new rule active on either side: perform the approved
   recovery sequence of source restore, necessary one-time recovery updater, then
   active-file restore. Do not retry, use a different route, or run an updater
   beyond those approved limits. Report partial success and stop only if recovery
   itself fails; otherwise report the recovered, unapplied change set.
4. For an approved non-managed standing-rule counterpart, edit only its approved
   persistent source. For an approved related-skill destination, edit only the
   approved persistent source-of-truth absolute path. Use the pre-write copies
   and approved recovery to restore every affected target if any write fails; do
   not leave one of multiple targets active alone. Do not add a new skill or alter
   unrelated skill text, caches, generated output, or temporary distributions.
5. For approved no-promotion outcomes, append their memo IDs and rejection dates
   to the one ledger. Update `last_sweep_at` only after every approved outcome in
   this run has been applied, using the fixed `sweep_started_at`.
6. For approved summary backfills, call `paput_update_memo` with the memo's
   complete required current fields and the approved summary. Never replace a
   memo body or classifications with partial data.
7. Re-read the changed targets and report applied and unapplied items separately.
   If any target write fails, stop that item, preserve the rest of the manifest,
   and state exactly which items were applied. On retry, compare the current block,
   ledger, and memo summaries first so already-applied items are not applied twice.

## Verify Application

Before declaring an approved run complete, check and report all of these:

- If a promote block existed before a managed updater, it remains byte-identical
  afterwards. After publication, the block is present; if both instruction files
  were targets, their blocks are byte-identical.
- The active managed counterpart is shortened exactly as approved.
- Each summary update preserved its memo body, categories, `memo_type_keys`,
  projects, and visibility.
- A second scoped sweep excludes every rejected ID recorded by the first run.
- After any write or updater failure, recovery completed and every restored target
  was re-read; otherwise report partial success with the exact applied and
  unapplied items.

## Rejection and Safety Rules

- Never write instruction files, skill bodies, the ledger, or PaPut summaries
  before explicit approval of the corresponding manifest items.
- Do not treat a summary backfill as harmless metadata: it has the same approval
  requirement as an instruction change.
- Do not expand the candidate pool beyond `principle` in this version.
- Do not write an automatic promotion flag to PaPut. The current instruction text
  is the promoted-state source of truth; the ledger records only rejections and
  sweep timing.
- Report partial success rather than silently retrying. Do not duplicate rule
  lines, ledger entries, or summary updates on a later attempt.

## Notes

- A sparse initial result is expected: only a few principles should survive into
  persistent context.
- `paput-capture` is the intake counterpart to this skill; use it first when the
  principle has not yet been captured as a memo.
