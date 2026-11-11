import type { SignedEvent } from "./nostr";

export type Relay = {
  query(filters: Record<string, unknown>[]): Promise<SignedEvent[]>;
  submit?(event: SignedEvent): Promise<unknown>;
};
