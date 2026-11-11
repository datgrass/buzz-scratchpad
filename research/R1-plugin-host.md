# R1 — Plugin host spike

## Question
Can a minimal external Buzz plugin own a Scratchpad dock page, bundle the buzzboard board fold into one `plugin.js`, and use the plugin relay/outbox APIs for board reads and a user-signed write?

## Answer (TL;DR)
Partially proven locally; blocked on owner UI installation for host/runtime proof.

- Built a spike plugin at `spike/plugin/` with id `datgrass.scratchpad-spike`.
- The plugin registers a primary dock page, its own sidebar, and a `route.lane` route parameter.
- The bundle is a single `plugin.js` with no runtime imports.
- Copied buzzboard fold code with MIT notice retained and added a small regression subset that passes.
- The page code uses `ctx.relay` with `session.read()` / `session.observe()` and `session.outbox.supports()` / `session.outbox.send()`.
- Amendment R1b added a kind-1630 status write probe with a buzzboard-compatible `assignee` tag for R2’s finished test card, assigning it to smarty.
- Justin installed/enabled the plugin in the dev build and confirmed the dock page, sidebar, raw relay reads, and a kind-9 outbox write.
- The first installed build exposed two important fixes/findings: raw reads returned all visible community lanes (not just Scratchpads), and the copied fold threw on frozen host event arrays. The local rebuild now copies before sorting and filters the displayed lanes to the spike channel.

## Evidence (sanitized)

| Check | Result |
|---|---|
| Build | `npm run build` produced `spike/plugin/plugin.js` |
| Runtime imports | grep for top-level `import` / `require(` returned zero matches |
| Fold tests | `npm test` passed 3/3 tests, including frozen host-event inputs |
| Manifest/basic bundle check | Local JSON/export/R1b/outbox-limit check passed |
| Host validation | `buzzodz` CLI path was not usable in this environment because the local Rust toolchain/linker failed before validation |
| Buzz UI install/load | Justin confirmed the dock page and sidebar render in the dev build |
| Raw relay read | Host showed observed counts for visible lane/card events, so `observe()` reads work |
| Fold | Old installed build threw on frozen host event arrays; local rebuild copies before sorting/mutating |
| Outbox | Host reports kind 9 supported and 1621/1630-1633/30617 unsupported |
| Kind-9 write | Accepted as a Justin-signed message in the private spike channel |

## Implications for design

- The plugin page shape in the design is implementable with the documented page API: `primary: true`, `placement: "dock"`, page `sidebar`, and a validated route parameter.
- Reusing buzzboard’s event fold is practical, but host relay event objects/arrays can be frozen. The fold adapter must copy before sorting or otherwise mutating derived arrays.
- Production needs a Scratchpad-only lane filter. A raw 30617 read returns other visible community repos; the spike now filters to the configured spike channel as a stand-in.
- 30617 lane creation remains outside this plugin spike because those events are sensitive; this aligns with the design decision that agents or owner-reviewed flows create lanes.
- A kind-9 write probe is a simple channel-write smoke test and can also carry dispatch/assignment instructions because kind 9 is writable.
- R1b showed the desired status-event assignment shape, but this host’s plugin outbox does not support 1621 or 1630-1633. Direct status/card writes as the user need another path.

## API stability notes

- Pages and navigation: documented as relatively steady; dock placement itself is noted as less stable than owning a page.
- Relay session read/observe model: documented as likely to break; isolate this behind a small adapter.
- Outbox writes: documented relay-session capability; callers must check `outbox.supports(kind)` before sending. In the dev host, this plugin could write kind 9 only, not 1621 or 1630-1633.
- Host commands: stable declared `manifest.host.commands` + `ctx.host.runCommand()` path exists, but commands are fixed in the manifest, run with no shell, and require owner review. A wrapper around the paired Buzz CLI might be possible for native CLI-supported writes, but the CLI cannot add arbitrary buzzboard `assignee` tags today.
- Agent tools: `ctx.agents.addTool()` runs as the agent and receives a `BuzzClient` with `publish(event)`, which can publish arbitrary templates as the agent. That may support agent-authored 1621/1630-1633 status/card writes, but not user-authored writes.
- Plugin packaging: API v1 requires one self-contained module with no CSS/assets/runtime imports; React comes from `ctx.react`.

## Open questions

1. Deep-link behavior still needs a quick check: `buzz://plugin?id=datgrass.scratchpad-spike&page=board&route.lane=spike-r2-lane` should open the page and show that route value.
2. After updating/reloading the rebuilt plugin, does the fold run without the readonly-property error and show only spike-channel lanes?
3. What is the preferred user-authored status/card write path if plugin outbox remains kind-9-only: owner-reviewed host command wrapper, a new host API, or a native assignment/status capability change?
4. Should assignment in v1 be represented first by kind-9 dispatch messages while status/assignee writes stay agent-authored?
5. Should the production plugin keep buzzboard fold code copied in-tree, or factor it into a smaller Scratchpad-specific relay fold now that lane/card/status requirements are clearer?
