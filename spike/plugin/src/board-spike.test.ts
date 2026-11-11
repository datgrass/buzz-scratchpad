import { describe, expect, it } from "vitest";
import { fetchBoard, type BoardData } from "./board";
import type { SignedEvent } from "./nostr";

const OWNER = "a".repeat(64);
const AGENT = "b".repeat(64);
const ADDR = `30617:${OWNER}:spike-r1-lane`;

function ev(kind: number, pubkey: string, id: string, created_at: number, tags: string[][], content = ""): SignedEvent {
  return { id, kind, pubkey, created_at, tags, content, sig: "0".repeat(128) };
}

function frozenEv(kind: number, pubkey: string, id: string, created_at: number, tags: string[][], content = ""): SignedEvent {
  return Object.freeze({
    id,
    kind,
    pubkey,
    created_at,
    tags: Object.freeze(tags.map((tag) => Object.freeze([...tag]) as unknown as string[])) as unknown as string[][],
    content,
    sig: "0".repeat(128),
  }) as SignedEvent;
}

class StubRelay {
  constructor(private events: SignedEvent[]) {}
  async query(filters: Record<string, unknown>[]): Promise<SignedEvent[]> {
    const out: SignedEvent[] = [];
    for (const filter of filters) {
      for (const event of this.events) {
        if (out.includes(event)) continue;
        if (Array.isArray(filter.kinds) && !(filter.kinds as number[]).includes(event.kind)) continue;
        let ok = true;
        for (const [key, value] of Object.entries(filter)) {
          if (!key.startsWith("#")) continue;
          const tag = key.slice(1);
          const wanted = value as string[];
          const have = event.tags.filter((t) => t[0] === tag).map((t) => t[1]);
          if (!wanted.some((v) => have.includes(v))) ok = false;
        }
        if (ok) out.push(event);
      }
    }
    return out;
  }
}

async function load(events: SignedEvent[]): Promise<BoardData> {
  return fetchBoard(new StubRelay(events), OWNER);
}

describe("buzzboard fold subset", () => {
  it("parses lanes and cards", async () => {
    const lane = ev(30617, OWNER, "1".padStart(64, "0"), 1, [["d", "spike-r1-lane"], ["name", "Spike R1 lane"]]);
    const issue = ev(1621, OWNER, "2".padStart(64, "0"), 2, [["a", ADDR], ["subject", "Check plugin host"]], "body");
    const board = await load([lane, issue]);
    expect(board.lanes[0].name).toBe("Spike R1 lane");
    expect(board.cards.get(ADDR)?.[0].subject).toBe("Check plugin host");
    expect(board.cards.get(ADDR)?.[0].column).toBe("backlog");
  });

  it("maps assignee draft status to blocked review", async () => {
    const lane = ev(30617, OWNER, "3".padStart(64, "0"), 1, [["d", "spike-r1-lane"]]);
    const issue = ev(1621, OWNER, "4".padStart(64, "0"), 2, [["a", ADDR], ["subject", "Blocked"]]);
    const assign = ev(1630, OWNER, "5".padStart(64, "0"), 3, [["e", issue.id], ["a", ADDR], ["assignee", AGENT]]);
    const blocked = ev(1633, AGENT, "6".padStart(64, "0"), 4, [["e", issue.id], ["a", ADDR]]);
    const board = await load([lane, issue, assign, blocked]);
    const card = board.cards.get(ADDR)?.[0];
    expect(card?.column).toBe("in_review");
    expect(card?.blocked).toBe(true);
  });

  it("folds frozen host event arrays without mutating them", async () => {
    const lane = frozenEv(30617, OWNER, "7".padStart(64, "0"), 1, [["d", "spike-r1-lane"], ["name", "Spike R1 lane"]]);
    const issue = frozenEv(1621, OWNER, "8".padStart(64, "0"), 2, [["a", ADDR], ["subject", "Frozen"]]);
    const assign = frozenEv(1630, OWNER, "9".padStart(64, "0"), 3, [["e", issue.id], ["a", ADDR], ["assignee", AGENT]]);
    const done = frozenEv(1631, AGENT, "a".padStart(64, "0"), 4, [["e", issue.id], ["a", ADDR]]);
    const board = await load(Object.freeze([lane, issue, assign, done]) as unknown as SignedEvent[]);
    const card = board.cards.get(ADDR)?.[0];
    expect(card?.assignee).toBe(AGENT);
    expect(card?.column).toBe("in_review");
  });
});
