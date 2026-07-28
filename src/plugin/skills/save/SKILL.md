---
name: paput-save
description: Use this to review pending candidates first, then save only candidates explicitly approved by the user. This skill never saves automatically.
---

# PaPut Save

Review pending knowledge candidates first, then save only candidates explicitly approved by the user. This skill never saves automatically.

## Steps

1. Fetch pending candidates with `paput_list_pending_candidates`.
2. Briefly show each candidate title, categories, memo type, summary, and similar memo information.
3. Save only candidates approved by the user with `paput_save_pending_candidates`. Pass all approved candidates as one `candidates` array in a single call rather than saving one at a time. Write a `summary` on each approved item: one line, at most 500 characters, stating what the memo decides or establishes so it reads on its own in a list. Base it on the body as it will be saved (after any override), not on the title alone. Omitting it leaves the memo without a summary, and listings show none.
4. Discard candidates the user rejects with `paput_discard_pending_candidates`, passing them as `{candidates: [{candidate_id, reason?}]}` in one call.
5. Report the number of saved and discarded candidates.

## Notes

- Do not save to PaPut without user approval.
- Save multiple candidates only when the user explicitly asks to save all of them; when they do, send the whole approved set in one `paput_save_pending_candidates` call. On a large review that produces many rejects, discard them in one `paput_discard_pending_candidates` call as well.
- If the user asks to modify a title, body, or memo type, apply the override on the candidate's item when saving (`memo_type_keys` replaces the full set). To edit candidates without saving yet, use `paput_update_pending_candidates` (batch the edits in one `candidates` array).
- For ambiguous or likely duplicate candidates, present not saving as an option.
- When a candidate has no similar memo information, check `paput_search_memo` with the candidate title as the query before saving and surface matches with a high `score` to the user.
