import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as RT from "@midnight-ntwrk/compact-runtime";
import {
  Contract,
  ledger,
} from "../contracts/managed/night-gate/contract/index.js";
import {
  createPrivateState,
  witnesses,
  type NightGatePrivateState,
} from "../src/witnesses.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const managed = join(root, "contracts", "managed", "night-gate");

const COIN = "0".repeat(64);
const ADDR = RT.sampleContractAddress();

function setup(score: bigint) {
  const privateState: NightGatePrivateState = createPrivateState(score);
  const contract = new Contract(witnesses);
  const ctor = contract.initialState(RT.createConstructorContext(privateState, COIN));
  const ctx = RT.createCircuitContext(
    ADDR,
    COIN,
    ctor.currentContractState,
    ctor.currentPrivateState,
  );
  return { contract, ctx, privateState };
}

describe("NightGate managed artifacts", () => {
  it("ships compiler, contract, keys, and zkir directories", () => {
    for (const dir of ["compiler", "contract", "keys", "zkir"]) {
      expect(existsSync(join(managed, dir)), `missing ${dir}`).toBe(true);
    }
  });

  it("lists expected circuits and witness in contract-info.json", () => {
    const infoPath = join(managed, "compiler", "contract-info.json");
    expect(existsSync(infoPath)).toBe(true);
    const info = JSON.parse(readFileSync(infoPath, "utf8")) as {
      circuits: { name: string }[];
      witnesses: { name: string }[];
      "compiler-version": string;
    };
    expect(info["compiler-version"]).toBe("0.31.1");
    const names = info.circuits.map((c) => c.name).sort();
    expect(names).toEqual(
      ["checkEligibility", "getCheckCount", "getEligible", "getLatestCommitment"].sort(),
    );
    expect(info.witnesses.map((w) => w.name)).toContain("privateClaim");
  });

  it("has prover/verifier keys for every circuit", () => {
    const keys = readdirSync(join(managed, "keys"));
    for (const circuit of [
      "checkEligibility",
      "getCheckCount",
      "getEligible",
      "getLatestCommitment",
    ]) {
      expect(keys).toContain(`${circuit}.prover`);
      expect(keys).toContain(`${circuit}.verifier`);
    }
  });
});

describe("NightGate runtime ledger", () => {
  it("starts with eligible=false, checkCount=0, empty commitment", () => {
    const { ctx } = setup(21n);
    const state = ledger(ctx.currentQueryContext.state);
    expect(state.eligible).toBe(false);
    expect(state.checkCount).toBe(0n);
    expect(state.latestCommitment.every((b) => b === 0)).toBe(true);
  });

  it("marks eligible=true and bumps count when score meets threshold", () => {
    const { contract, ctx } = setup(21n);
    const after = contract.impureCircuits.checkEligibility(ctx, 21n);
    const state = ledger(after.context.currentQueryContext.state);
    expect(state.eligible).toBe(true);
    expect(state.checkCount).toBe(1n);
    expect(state.latestCommitment.some((b) => b !== 0)).toBe(true);

    const eligible = contract.impureCircuits.getEligible(after.context);
    expect(eligible.result).toBe(true);
    const count = contract.impureCircuits.getCheckCount(after.context);
    expect(count.result).toBe(1n);
  });

  it("allows under-threshold checks but sets eligible=false", () => {
    const { contract, ctx } = setup(16n);
    const after = contract.impureCircuits.checkEligibility(ctx, 16n);
    const state = ledger(after.context.currentQueryContext.state);
    expect(state.eligible).toBe(false);
    expect(state.checkCount).toBe(1n);
    // Commitment still updates so observers see a check happened without the score
    expect(state.latestCommitment.some((b) => b !== 0)).toBe(true);
  });
});
