# R3 — Parallel sessions

## Question
Can one thread-scoped Buzz goose agent (`smarty`) run multiple channel threads concurrently, supporting the Scratchpad design of one Worker Bee handling N parallel card threads?

## Answer (TL;DR)
Yes. In this spike, the same thread-scoped agent handled two simultaneous threads and then four simultaneous threads with overlapping 60-second shell sleeps. The four-thread round had all work intervals overlap, with only a few seconds of start skew.

Session continuity also worked: a follow-up in one thread was answered from that thread's context and recalled the earlier timestamp.

## Evidence (sanitized)

### Baseline
- Before the test, there were 3 visible `goose-acp` processes.
- Read-only source inspection confirms Buzz keys thread-scoped sessions by `channel/root`, while DMs and channel-scoped agents use the channel key. The ACP session manager documents one session per conversation and a shared pool limit of 48.

### Round A — 2 threads
Both top-level messages were posted in the same second.

| thread | message time | agent work start | agent work end | reply time | verdict |
|---|---:|---:|---:|---:|---|
| A1 | 11:03:58 | 11:04:01 | 11:05:01 | 11:05:05 | overlapped |
| A2 | 11:03:58 | 11:04:01 | 11:05:01 | 11:05:05 | overlapped |

Result: both 60-second intervals fully overlapped.

### Round B — 4 threads
All four top-level messages were posted in the same second.

| thread | message time | agent work start | agent work end | reply time | verdict |
|---|---:|---:|---:|---:|---|
| B1 | 11:05:38 | 11:05:45 | 11:06:45 | 11:06:49 | overlapped |
| B2 | 11:05:38 | 11:05:42 | 11:06:42 | 11:06:46 | overlapped |
| B3 | 11:05:38 | 11:05:43 | 11:06:43 | 11:06:47 | overlapped |
| B4 | 11:05:38 | 11:05:43 | 11:06:43 | 11:06:48 | overlapped |

Result: all four intervals overlapped. The common overlap window was about 57 seconds.

### Session continuity
A follow-up in B1 asked the agent to recall its first timestamp. It answered within a few seconds with `11:05:45`, matching its earlier reply, and said it was answering from the thread's own conversation memory.

### Contention observed
Other spike builders were also using `smarty` during the test window. R2 and R4 messages/replies were interleaved with R3, but R3 still started each thread within roughly 3–7 seconds and completed without retry.

## Implications for design
- D15 is viable for v1: one generic Worker Bee can handle multiple card threads concurrently when the agent is thread-scoped.
- The 4-worker concurrency cap is reasonable from this run: four simultaneous thread wakes completed normally and quickly.
- One card ↔ one worker thread remains the right unit of isolation. The agent preserved per-thread context and did not appear to mix thread memory.
- The Scratchpad orchestrator should still track worker start latency and active thread count, because shared-agent contention can exist when other tasks are also waking the same agent.

## Open questions
- How does concurrency behave with real build/research tasks that use tools for longer than 60 seconds?
- Does the same behavior hold when the Worker Bee has plugin-provided Scratchpad tools enabled?
- Should the product expose worker queueing/latency telemetry on the board for debugging blocked or slow cards?
