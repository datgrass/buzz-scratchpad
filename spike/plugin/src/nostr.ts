export type SignedEvent = {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig?: string;
};

export class Signer {
  readonly pubkey = "";
  signEvent(): SignedEvent {
    throw new Error("Signing is intentionally unavailable in the keyless Scratchpad spike plugin");
  }
}
