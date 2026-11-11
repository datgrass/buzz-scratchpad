import { COLUMNS, KIND_GIT_ISSUE, KIND_REPO_ANNOUNCEMENT, STATUS_KINDS } from "./kinds";
import { fetchBoard, type BoardData, type Lane } from "./board";
import type { SignedEvent } from "./nostr";

type ReactApi = typeof import("react");
type Connection = {
  status: string;
  scope?: string;
  generation?: number;
  viewer?: string;
  session?: RelaySession;
};
type RelayService = { subscribe(listener: () => void): () => void; snapshot(): Connection };
type RelaySession = {
  read(filters: Record<string, unknown>[], options?: { signal?: AbortSignal }): Promise<SignedEvent[]>;
  observe(filters: Record<string, unknown>[]): RelayView;
  outbox?: {
    supports(kind: number): boolean;
    send(input: { kind: number; content: string; tags: string[][] }): string;
  };
};
type RelayView = {
  subscribe(listener: () => void): () => void;
  dispose(): void;
  refresh(): void;
  snapshot(): { status: string; events: SignedEvent[]; error?: string };
};

type PageProps = { navigation?: { target?: { route?: { params?: unknown } } } };

type Ctx = {
  react: ReactApi;
  pages: { register(page: Record<string, unknown>): void };
  relay: RelayService;
};

const PLUGIN_ID = "datgrass.scratchpad-spike";
const PAGE_ID = "board";
// Private IDs live in src/spike.config.json (gitignored). Copy spike.config.example.json to create it.
import spikeConfig from "./spike.config.json";
const SPIKE_CHANNEL_ID: string = spikeConfig.spikeChannelId;
const SPIKE_CHANNEL_LABEL = "configured spike channel";
const R2_ASSIGNMENT_PROBE = {
  issue: spikeConfig.assignmentProbe.issue,
  lane: `30617:${spikeConfig.assignmentProbe.laneOwner}:${spikeConfig.assignmentProbe.laneId}`,
  laneOwnerAndAssignee: spikeConfig.assignmentProbe.laneOwner,
};

function routeLane(params: unknown): string | undefined {
  if (!params || typeof params !== "object" || Array.isArray(params)) return undefined;
  const lane = (params as Record<string, unknown>).lane;
  return typeof lane === "string" && lane.length <= 256 ? lane : undefined;
}

function useRelayConnection(React: ReactApi, relay: RelayService): Connection {
  return React.useSyncExternalStore(relay.subscribe, relay.snapshot, relay.snapshot);
}

function laneIsInSpikeChannel(lane: Lane | { channelId?: string | null }) {
  return lane.channelId === SPIKE_CHANNEL_ID;
}

function laneEventIsInSpikeChannel(event: SignedEvent) {
  return event.tags.some((tag) => tag[0] === "buzz-channel" && tag[1] === SPIKE_CHANNEL_ID);
}

function useObservedEvents(React: ReactApi, session: RelaySession | undefined, filters: Record<string, unknown>[]) {
  const [snapshot, setSnapshot] = React.useState<{ status: string; events: SignedEvent[]; error?: string }>({
    status: session ? "loading" : "unavailable",
    events: [],
  });
  React.useEffect(() => {
    if (!session) {
      setSnapshot({ status: "unavailable", events: [] });
      return;
    }
    const view = session.observe(filters);
    const update = () => setSnapshot(view.snapshot());
    const unsubscribe = view.subscribe(update);
    update();
    view.refresh();
    return () => {
      unsubscribe();
      view.dispose();
    };
  }, [session, JSON.stringify(filters)]);
  return snapshot;
}

function sessionRelay(session: RelaySession) {
  return {
    query: (filters: Record<string, unknown>[]) => session.read(filters),
  };
}

function countCards(board: BoardData) {
  let total = 0;
  for (const cards of board.cards.values()) total += cards.length;
  return total;
}

function laneSummary(lane: Lane, selected: boolean, React: ReactApi) {
  return React.createElement(
    "li",
    {
      key: lane.address,
      style: {
        padding: "0.35rem 0.5rem",
        borderRadius: "0.5rem",
        background: selected ? "var(--color-surface-selected, rgba(127,127,127,0.14))" : "transparent",
        overflowWrap: "anywhere",
      },
    },
    React.createElement("strong", null, lane.name),
    React.createElement("div", { style: { opacity: 0.72, fontSize: "0.85em" } }, lane.repoId),
  );
}

export const inject = ["react", "pages", "relay"];

export function apply(ctx: Ctx) {
  const React = ctx.react;

  function Sidebar({ target, children }: { target?: { route?: { params?: unknown } }; children?: unknown }) {
    const connection = useRelayConnection(React, ctx.relay);
    const selectedLane = routeLane(target?.route?.params);
    const observed = useObservedEvents(React, connection.status === "ready" ? connection.session : undefined, [
      { kinds: [KIND_REPO_ANNOUNCEMENT], limit: 200 },
    ]);
    const allLaneEvents = observed.events
      .filter((event) => event.kind === KIND_REPO_ANNOUNCEMENT);
    const lanes = allLaneEvents
      .filter(laneEventIsInSpikeChannel)
      .map((event) => ({
        address: `30617:${event.pubkey}:${event.tags.find((t) => t[0] === "d")?.[1] ?? ""}`,
        repoId: event.tags.find((t) => t[0] === "d")?.[1] ?? "",
        name: event.tags.find((t) => t[0] === "name")?.[1] ?? event.tags.find((t) => t[0] === "d")?.[1] ?? "Untitled lane",
      }))
      .filter((lane) => lane.repoId)
      .slice(0, 20);

    return React.createElement(
      "div",
      { className: "shell-sidebar-default" },
      React.createElement(
        "aside",
        { style: { padding: "var(--space-panel-inset)", overflow: "auto" }, "aria-label": "Scratchpad spike sidebar" },
        React.createElement("h2", null, "Scratchpads"),
        React.createElement("p", { style: { opacity: 0.72 } }, `${lanes.length} spike lane(s), ${allLaneEvents.length} visible lane(s) total`),
        lanes.length
          ? React.createElement("ul", { style: { listStyle: "none", padding: 0, margin: 0, display: "grid", gap: "0.25rem" } },
              lanes.map((lane) => laneSummary(lane as Lane, lane.address === selectedLane || lane.repoId === selectedLane, React)))
          : React.createElement("p", null, "No spike-channel lanes yet."),
        children,
      ),
    );
  }

  function BoardPage({ navigation }: PageProps) {
    const connection = useRelayConnection(React, ctx.relay);
    const [board, setBoard] = React.useState<BoardData | null>(null);
    const [readStatus, setReadStatus] = React.useState("idle");
    const [writeStatus, setWriteStatus] = React.useState("not attempted");
    const [assignmentStatus, setAssignmentStatus] = React.useState("not attempted");
    const selectedLane = routeLane(navigation?.target?.route?.params);

    const observedRepos = useObservedEvents(React, connection.status === "ready" ? connection.session : undefined, [
      { kinds: [KIND_REPO_ANNOUNCEMENT], limit: 200 },
    ]);
    const observedIssues = useObservedEvents(React, connection.status === "ready" ? connection.session : undefined, [
      { kinds: [KIND_GIT_ISSUE], limit: 200 },
    ]);

    React.useEffect(() => {
      if (connection.status !== "ready" || !connection.session) {
        setReadStatus(`relay ${connection.status}`);
        setBoard(null);
        return;
      }
      const controller = new AbortController();
      setReadStatus("loading");
      fetchBoard(sessionRelay(connection.session), connection.viewer ?? "")
        .then((next) => {
          if (!controller.signal.aborted) {
            setBoard(next);
            setReadStatus("ready");
          }
        })
        .catch((error) => {
          if (!controller.signal.aborted) setReadStatus(`error: ${String(error?.message ?? error)}`);
        });
      return () => controller.abort();
    }, [connection.status, connection.scope, connection.generation, connection.session, connection.viewer]);

    const supports = [9, 1621, 1630, 1631, 1632, 1633, 30617]
      .map((kind) => `${kind}:${connection.session?.outbox?.supports(kind) ? "yes" : "no"}`)
      .join(" · ");

    const writeProbe = () => {
      try {
        const outbox = connection.session?.outbox;
        if (!outbox) {
          setWriteStatus("no outbox on this connection");
          return;
        }
        if (!outbox.supports(9)) {
          setWriteStatus("kind 9 unsupported by outbox");
          return;
        }
        const id = outbox.send({
          kind: 9,
          content: "[spike R1] Scratchpad plugin-host write probe from the spike plugin.",
          tags: [["h", SPIKE_CHANNEL_ID]],
        });
        setWriteStatus(`kind 9 queued: ${id}`);
      } catch (error) {
        setWriteStatus(`write failed: ${String((error as Error)?.message ?? error)}`);
      }
    };

    const assignmentProbe = () => {
      try {
        const outbox = connection.session?.outbox;
        if (!outbox) {
          setAssignmentStatus("no outbox on this connection");
          return;
        }
        if (!outbox.supports(1630)) {
          setAssignmentStatus("kind 1630 unsupported by this plugin outbox; assignment/status writes need another path");
          return;
        }
        const id = outbox.send({
          kind: 1630,
          content: "Scratchpad R1b assignment probe: assign spike-r2-card-1 to smarty via buzzboard assignee tag.",
          tags: [
            ["e", R2_ASSIGNMENT_PROBE.issue, "", "root"],
            ["a", R2_ASSIGNMENT_PROBE.lane],
            ["p", R2_ASSIGNMENT_PROBE.laneOwnerAndAssignee],
            ["assignee", R2_ASSIGNMENT_PROBE.laneOwnerAndAssignee],
          ],
        });
        setAssignmentStatus(`kind 1630 assignment queued: ${id}`);
      } catch (error) {
        setAssignmentStatus(`assignment failed: ${String((error as Error)?.message ?? error)}`);
      }
    };

    const allLanes = board?.lanes ?? [];
    const lanes = allLanes.filter(laneIsInSpikeChannel);
    const activeLane = selectedLane
      ? lanes.find((lane) => lane.address === selectedLane || lane.repoId === selectedLane)
      : lanes[0];
    const cards = activeLane ? board?.cards.get(activeLane.address) ?? [] : [];

    return React.createElement(
      "main",
      { style: { padding: "var(--space-panel-inset)", display: "grid", gap: "1rem" } },
      React.createElement("section", { className: "ui-card", style: { padding: "var(--space-panel-inset)" } },
        React.createElement("h1", null, "Scratchpad (spike)"),
        React.createElement("p", null, "Dock page + page sidebar + route param + relay read/outbox write probe."),
        React.createElement("p", null, `route.lane = ${selectedLane ?? "(none)"}`),
        React.createElement("p", null, `relay/read = ${readStatus}; observed 30617=${observedRepos.events.length}, 1621=${observedIssues.events.length}; spike lanes=${lanes.length}/${allLanes.length}`),
        React.createElement("p", null, `outbox supports: ${supports}`),
        React.createElement("p", { style: { opacity: 0.72 } }, "Observed in dev: plugin outbox only supports kind 9, so status/card assignment writes are disabled unless this host reports 1630 support."),
        React.createElement("button", { type: "button", onClick: writeProbe }, `Write kind-9 probe to ${SPIKE_CHANNEL_LABEL}`),
        React.createElement("p", null, writeStatus),
        React.createElement("button", { type: "button", onClick: assignmentProbe }, "Write R1b kind-1630 assignment probe for spike-r2-card-1"),
        React.createElement("p", null, assignmentStatus),
        React.createElement("p", { style: { opacity: 0.72 } }, `Deep link: buzz://plugin?id=${PLUGIN_ID}&page=${PAGE_ID}&route.lane=x`),
      ),
      React.createElement("section", { style: { display: "grid", gridTemplateColumns: "repeat(6, minmax(10rem, 1fr))", gap: "0.75rem", overflowX: "auto" } },
        COLUMNS.map((column) => React.createElement("div", { key: column, className: "ui-card", style: { padding: "0.75rem", minHeight: "12rem" } },
          React.createElement("h2", { style: { fontSize: "1rem" } }, column),
          cards.filter((card) => card.column === column).map((card) => React.createElement("article", { key: card.id, style: { border: "1px solid var(--color-border, rgba(127,127,127,0.24))", borderRadius: "0.5rem", padding: "0.5rem", marginTop: "0.5rem" } },
            React.createElement("strong", null, card.subject),
            React.createElement("div", { style: { opacity: 0.7, fontSize: "0.8em" } }, `${card.id.slice(0, 8)} · ${card.blocked ? "blocked" : "open"}`),
          )),
        )),
      ),
      React.createElement("p", { style: { opacity: 0.72 } }, `Folded spike lanes=${lanes.length}; all folded lanes=${allLanes.length}; cards=${board ? countCards(board) : 0}.`),
    );
  }

  ctx.pages.register({
    id: PAGE_ID,
    title: "Scratchpad (spike)",
    primary: true,
    placement: "dock",
    layout: "workspace",
    route: { version: 1, validate: (params: unknown) => !params || !!routeLane(params) },
    sidebar: Sidebar,
    component: BoardPage,
  });
}
