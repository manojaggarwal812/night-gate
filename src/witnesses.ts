/**
 * NightGate witnesses — private claim never leaves the prover machine in cleartext.
 *
 * Encoding: first 8 bytes of the 32-byte claim are little-endian u64 score/age.
 * Remaining bytes may carry domain separation / padding.
 */

export type NightGatePrivateState = {
  /** Full 32-byte private claim payload */
  claim: Uint8Array;
};

export const THRESHOLD = 18n;

/** Encode a u64 score into a 32-byte claim (LE first 8 bytes). */
export function encodeClaim(score: bigint): Uint8Array {
  const claim = new Uint8Array(32);
  const view = new DataView(claim.buffer);
  view.setBigUint64(0, score, true);
  // Domain tag in trailing 8 bytes (not secret — padding marker only)
  const tag = new TextEncoder().encode("NightGat"); // exactly 8 bytes
  claim.set(tag, 24);
  return claim;
}

export function decodeScore(claim: Uint8Array): bigint {
  if (claim.length !== 32) {
    throw new Error(`NightGate claim must be 32 bytes, got ${claim.length}`);
  }
  return new DataView(claim.buffer, claim.byteOffset, claim.byteLength).getBigUint64(0, true);
}

export function createPrivateState(score: bigint): NightGatePrivateState {
  return { claim: encodeClaim(score) };
}

/**
 * Compact witness binding: `privateClaim(): Bytes<32>`
 * Shape matches @midnight-ntwrk/compact-runtime WitnessContext pattern.
 */
export const witnesses = {
  privateClaim(
    context: { privateState: NightGatePrivateState },
  ): [NightGatePrivateState, Uint8Array] {
    const { claim } = context.privateState;
    if (!(claim instanceof Uint8Array) || claim.length !== 32) {
      throw new Error("privateClaim witness requires a 32-byte claim in private state");
    }
    return [context.privateState, claim];
  },
};
