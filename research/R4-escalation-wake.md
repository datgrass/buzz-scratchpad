# R4 — Escalation wake mechanics

## Question

Can a thread-scoped worker agent escalate a blocker to the owner with an explicit mention and numbered options, then resume after the owner replies? Which signals wake the agent: direct @mention, plain thread reply, event watch, and self-mention?

## Answer (TL;DR)

- **Escalation works** when the agent explicitly mentions the owner and lists numbered options.
- **Plain thread replies do not wake** the thread-scoped agent, even when replying in the same thread it started.
- **@mention replies do wake** the agent quickly; in the live test it resumed in about 5 seconds and completed with the chosen option.
- **Event watches can wake** the agent into a specific thread without an @mention; in the live test, a top-level unmentioned ping produced a thread reply in about 9 seconds.
- **Self-mention did not wake** the agent in this test. A message signed by the agent that p-tagged itself produced no follow-up turn within the observation window.
- **Watch filtering caveat:** the attention event watch could not deterministically filter by message text, so the tested watch listened to top-level channel messages and let the agent self-filter for the trigger phrase. That works but can be noisy.

## Evidence (sanitized)

| Probe | Result | Latency observed | Sanitized evidence |
|---|---:|---:|---|
| Owner escalation | Passed | ~11s from owner prompt to blocked reply | Agent replied in the R4 thread with a blocked marker, owner mention, and three numbered color options. |
| Plain reply | Did **not** wake | No response after >3 min | Owner posted `[spike R4] 2` as a plain thread reply; no agent completion followed. |
| @mention reply | Woke | ~5s | Owner posted `[spike R4] @smarty 2`; agent replied that option 2 was selected. |
| Event watch | Woke | ~9s | Temporary R4 watch fired on an unmentioned top-level message containing `spike-r4-ping` and replied back into the R4 thread. |
| Self-mention | Did **not** wake | No follow-up after >3 min | Agent posted a reply mentioning itself; no separate “woke me” response appeared. |
| Cleanup | Passed | n/a | Agent reported the temporary R4 watch and interest removed; subsequent list/show checks were empty/not-found. |

## Implications for design

- Scratchpad blocker escalation should use **explicit @owner mentions plus numbered options** for v1 approvals.
- A blocked worker should instruct the owner to reply with **@worker** (or the UI should insert it), because a plain reply is not enough to resume a thread-scoped agent.
- A Queen/orchestrator can use `watch_add` for channel-level wakeups, but broad watches may create noise unless there is a deterministic selector or a tighter delivery strategy.
- One agent should not rely on **self-mentions** to orchestrate itself across threads. Use a real handoff/wake path or a channel-scoped orchestrator instead.

## Open questions

- Does the owner’s explicit mention reliably show in Activity › Mentions / OS notifications in Justin’s UI? Not verified from this builder session.
- Can plugin-level wakes or `self_handoff` provide a cleaner single-agent orchestration path than event watches for cross-thread work?
