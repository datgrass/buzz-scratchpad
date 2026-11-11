# R2 — Board loop with agents

## Question
Can the buzzboard-style board loop work keylessly in our setup: an agent-owned lane, a user-authored card, and agent-authored status events that move the card through the board?

## Answer (TL;DR)
Mostly yes, with two important caveats.

- Agents can use the Buzz CLI from their session for ordinary reads/writes and can sign status events as themselves.
- A local/paired user CLI can create issue cards (kind 1621) and user-authored status events (kinds 1630–1633), but cannot create a lane/repo (kind 30617).
- The agent also could not create a lane via its local CLI, but its Buzz `repo` tool could create the lane.
- Native `buzz issues assign` currently attempted a kind-1 write and was denied for local callers in both user and agent paths. For this spike, the dispatch thread plus agent-authored status events proved the worker-move part; buzzboard-style `assignee` tag writing still needs a plugin/relay path or a CLI/tool fix.
- Because the assignment tag was absent, buzzboard’s current fold rules would treat the latest agent `resolved` status as lane-owner/strict-actor authority and put the card in **Done**, not **In Review**. If the assignee tag were present and equal to the agent, the same resolved status would fold to **In Review** as intended.

## Evidence (sanitized)
- S3: smarty ran `buzz --help` and `buzz issues --help` from its session and replied from the smarty identity. It reported the CLI was available and using an injected desktop credential provider rather than any private key.
- S4: `buzz repos create` from smarty’s local CLI failed with `Kind 30617 can't be signed by a local tool`; retrying through smarty’s `repo` tool created `spike-r2-lane`. The lane announcement is kind 30617, authored by smarty, with tags including `d=spike-r2-lane`, `name=spike-r2-lane`, and a channel binding.
- S5: paired user CLI created `spike-r2-card-1` as kind 1621. The card body used fixed `## Definition` and `## Outcome` sections and had label `build`. The card author is the user; the lane owner tag points to smarty.
- S6: native assignment failed with local signing denial for kind 1. A dispatch thread still woke smarty. With the full CLI path/env, smarty successfully wrote:
  - an `open` status event (kind 1630), signed by smarty
  - a `resolved` status event (kind 1631), signed by smarty
- User/card-author authority test: the paired user CLI successfully wrote a `resolved` status event on the card, with the lane address and lane-owner tags. Under buzzboard rules, the card author is a strict actor, so this is sufficient to move the card to Done.
- S11 clutter from CLI/docs:
  - The lane appears in `buzz repos get` / `buzz repos list` for smarty.
  - It is bound to the spike channel through its channel-binding tag, so native repo/project surfaces that list 30617 repo announcements can discover it.
  - Buzz Desktop has native repo browsing, but no kanban. The spike did not require a visual UI screenshot because CLI/docs were enough to establish discoverability.

## Implications for design
- Lane creation should not rely on host/local CLI signing. It needs an agent/tool path, an owner-reviewed UI path, or a plugin flow that delegates sensitive 30617 creation to an agent/approved capability.
- Card creation and status changes are compatible with the keyless local-tool policy for ordinary kinds.
- Worker status updates are viable: an agent can publish status events as itself using the full Buzz CLI path/env from its session.
- Assignment is the main gap. Scratchpad should either:
  - implement buzzboard-compatible `assignee` status tags through plugin `session.outbox`, or
  - align with/fix native `buzz issues assign` so it can publish a trusted assignment without using a denied kind.
- Without an assignee tag, lane-owner-as-worker collapses the distinction between worker review and owner done. R5’s separate Queen/Worker identities are still important.
- The fixed card body sections from D23 worked fine in native issue cards.

## Open questions
- What event kind should native `buzz issues assign` use in this environment, and why did it attempt denied kind 1?
- Should Scratchpad write buzzboard `assignee` tags itself, or wait for native assignment compatibility?
- How much repo/lane clutter is acceptable in native Buzz repo lists once every scratchpad creates a lane?
