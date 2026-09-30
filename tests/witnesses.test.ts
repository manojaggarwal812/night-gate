import { describe, expect, it } from "vitest";
import {
  THRESHOLD,
  bytesToHex,
  createPrivateState,
  encodeClaim,
  hexToBytes,
  witnesses,
} from "../src/witnesses.js";

describe("NightGate claim encoding", () => {
  it("encodes LE u64 score in the first 8 bytes with NightGat tag", () => {
    const claim = encodeClaim(21n);
    expect(claim).toHaveLength(32);
    const view = new DataView(claim.buffer);
    expect(view.getBigUint64(0, true)).toBe(21n);
    expect(new TextDecoder().decode(claim.slice(24, 32))).toBe("NightGat");
  });

  it("round-trips hex helpers", () => {
    const claim = encodeClaim(18n);
    const hex = bytesToHex(claim);
    expect(hex).toHaveLength(64);
    expect(bytesToHex(hexToBytes(hex))).toBe(hex);
  });

  it("exposes threshold 18 and a valid privateClaim witness", () => {
    expect(THRESHOLD).toBe(18n);
    const state = createPrivateState(30n);
    const [next, claim] = witnesses.privateClaim({ privateState: state });
    expect(next).toBe(state);
    expect(claim).toHaveLength(32);
  });

  it("rejects malformed private claims", () => {
    expect(() =>
      witnesses.privateClaim({
        privateState: { claim: new Uint8Array(16) },
      }),
    ).toThrow(/32-byte claim/);
  });
});
