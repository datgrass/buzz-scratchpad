# Scratchpad spike: findings (slice 1)

The spike ran 2026-11-11 against a Buzz 1.0 dev build in one private test channel, with a single local goose agent
(thread scope) as the stand-in for every agent role. Details: `R1`–`R4` in this folder. Raw evidence is kept privately.

## TL;DR
| Question | Answer | Evidence |
|---|---|---|
| Can one agent work several cards at once? | **Yes.** 4 threads ran concurrently (≈57 s overlap, 3–7 s start lag) and each kept its own memory. | R3 |
| Can a plugin own a dock app with its own sidebar? | **Yes.** It shows in the app dock; the sidebar and route param work. | R1 |
| Can a plugin read board data (buzzboard events)? | **Yes**, via the relay session (`observe`/`read`). Host events are **frozen**: copy before sorting. | R1 |
| Can a plugin write as the user? | **Only chat messages (kind 9).** The outbox refuses issue (1621) and status (1630–1633) kinds. | R1 |
| Can the paired CLI write cards/status as the user? | **Yes** (1621, 1631 accepted). It can't create lanes (30617) or channels, and can't natively assign (kind 1). | R2 |
| Can agents create lanes, cards, status? | **Yes.** Lanes via the agent's `repo` Buzz tool (its local CLI is refused); status via the CLI with the full path + env (bare `buzz` has no credentials). | R2 |
| Can plugin agent tools write arbitrary events? | **Likely yes**, as the agent (`BuzzClient.publish`). Not yet exercised. | R1 |
| Native `buzz issues assign`? | **Refused for every local caller**: it publishes a kind-1 note. | R2 |
| Does escalation reach the owner? | **Yes.** The agent posts blocked + @owner + numbered options in the card thread. | R4 |
| Does the owner's reply wake the agent? | **Only if it @mentions the agent** (~5 s). Plain replies are ignored. | R4 |
| Can an agent wake itself by @mention? | **No.** | R4 |
| Can a watch wake an orchestrator without mentions? | **Yes** (~9 s), but it can't filter on text: every top-level message wakes it. | R4 |
| Lane clutter? | Lanes appear in repo lists and the native repo views. The board must filter to scratchpad lanes (a plain 30617 query also returns other people's repos). | R1, R2 |

## Design consequences
1. **Write path splits by actor.** The plugin page *reads* the board and *posts messages*. **Agents write card state**
   through plugin agent tools (`card_create`, `card_assign`, `card_status`, `card_block`) that publish as the agent. The
   user's own card actions (accept in Triage, move to Done) go either through an agent on the user's behalf or through a
   declared host command wrapping the paired CLI. Still to decide.
2. **Assignment = an `assignee` tag on a status event, written by the Queen** (lane owner) through a plugin tool, plus
   buzzboard's kind-9 dispatch message in the card thread. Native assign is unusable.
3. **Queen ≠ Worker identity** (self-mention doesn't wake, and the owner/assignee split is needed for In Review vs Done).
   This confirms D14.
4. **Answering a blocker must @mention the agent.** The plugin's "answer" action should always add the mention.
5. **Lane filter:** only show lanes the plugin created (e.g. a `t`/label or `buzz-channel` it knows), never all 30617s.
6. **Agent CLI env:** worker instructions (or plugin tools) must avoid bare `buzz`. Prefer plugin tools.
7. **Cap of 4 workers is comfortable** for one Worker Bee identity.

## Still open (→ R5 and next slice)
- Queen Bee with channel scope vs a watch for orchestration (noise, session placement).
- Distinct Queen (lane owner) + Worker (assignee): card lands in **In Review**, and only the user → Done.
- Exercise a plugin agent tool that publishes 1621/1630 with assignee tags.
- How the user's own board actions get written (agent-on-behalf vs host command).
- Did the owner see escalations in Activity › Mentions / notifications? (pending Justin)
