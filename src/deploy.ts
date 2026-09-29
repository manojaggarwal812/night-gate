/**
 * Non-interactive Preview deploy for NightGate (Level 1 — New Moon).
 *
 * Usage:
 *   MIDNIGHT_SEED=<64-hex> npm run deploy:preview
 *   # or omit seed to generate one, print faucet URL, wait for funds
 *
 * After success writes docs/evidence/DEPLOYMENT.md (never writes the seed).
 */

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import * as Rx from "rxjs";
import { Buffer } from "buffer";

import { deployContract } from "@midnight-ntwrk/midnight-js-contracts";
import { toHex } from "@midnight-ntwrk/midnight-js-utils";
import { unshieldedToken } from "@midnight-ntwrk/ledger-v8";
import { generateRandomSeed } from "@midnight-ntwrk/wallet-sdk-hd";

import {
  createWallet,
  createProviders,
  compiledContract,
  zkConfigPath,
  CONFIG,
} from "./utils.js";
import { createPrivateState } from "./witnesses.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function assertArtifacts() {
  for (const dir of ["compiler", "contract", "keys", "zkir"]) {
    const p = join(zkConfigPath, dir);
    if (!existsSync(p)) {
      throw new Error(`Missing managed artifact: ${p}. Run npm run compile:wsl`);
    }
  }
  console.log("Managed artifacts OK:", zkConfigPath);
}

function writeDeployEvidence(address: string, deployer: string, extra = "") {
  const evidenceDir = join(root, "docs", "evidence");
  mkdirSync(evidenceDir, { recursive: true });
  const stamp = new Date().toISOString();
  const body = `# NightGate — Preview deployment

| Field | Value |
|---|---|
| Network | Preview (Level 1 — New Moon) |
| Contract address | \`${address}\` |
| Deployer unshielded | \`${deployer}\` |
| Timestamp (UTC) | ${stamp} |
| Proof server | \`${CONFIG.proofServer}\` |
| Indexer | \`${CONFIG.indexer}\` |
| Node / RPC | \`${CONFIG.node}\` |
| Faucet | \`${CONFIG.faucet}\` |

## Notes

- Level 1 primary evidence is **Preview**, not Preprod.
- Secrets (seeds) are never committed. Use \`.env\` locally only.
${extra}

## Log snippet

\`\`\`
NightGate deploy target: Preview
Contract: ${address}
Deployer: ${deployer}
At: ${stamp}
\`\`\`
`;

  writeFileSync(join(evidenceDir, "DEPLOYMENT.md"), body);
  writeFileSync(
    join(evidenceDir, "preview-deploy.txt"),
    `network=preview\ncontract=${address}\ndeployer=${deployer}\nat=${stamp}\n`,
  );
  console.log("Wrote docs/evidence/DEPLOYMENT.md");
}

async function requestFaucet(address: string) {
  const url = CONFIG.faucet.replace(/\/$/, "");
  const attempts = [
    { path: "/request", body: { address } },
    { path: "/api/request", body: { address } },
    { path: "/", body: { address } },
  ];
  for (const a of attempts) {
    try {
      const res = await fetch(`${url}${a.path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(a.body),
      });
      const text = await res.text();
      console.log(`Faucet ${a.path} → ${res.status}: ${text.slice(0, 200)}`);
      if (res.ok) return true;
    } catch (err) {
      console.log(`Faucet ${a.path} failed:`, err);
    }
  }
  return false;
}

async function main() {
  console.log("\n=== NightGate Preview deploy (Level 1) ===\n");
  assertArtifacts();

  // Allow recording a known address without live deploy
  const existing = process.env.MIDNIGHT_CONTRACT_ADDRESS?.trim();
  if (existing && process.env.RECORD_ONLY === "1") {
    writeDeployEvidence(
      existing,
      process.env.MIDNIGHT_DEPLOYER_ADDRESS ?? "(provided)",
    );
    return;
  }

  const seed =
    process.env.MIDNIGHT_SEED?.trim() ||
    toHex(Buffer.from(generateRandomSeed()));

  if (!process.env.MIDNIGHT_SEED) {
    console.log(
      "Generated ephemeral seed (NOT saved to disk). Re-fund this address if you need to re-deploy.",
    );
  }

  console.log("Creating wallet + syncing Preview…");
  const walletCtx = await createWallet(seed);
  const state = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(
      Rx.throttleTime(3000),
      Rx.filter((s) => s.isSynced),
    ),
  );

  const address = walletCtx.unshieldedKeystore.getBech32Address();
  let balance = state.unshielded.balances[unshieldedToken().raw] ?? 0n;
  console.log(`Deployer unshielded: ${address}`);
  console.log(`Balance: ${balance.toString()} tNIGHT units`);

  if (balance === 0n) {
    console.log(`Requesting faucet funds… visit ${CONFIG.faucet} if API fails`);
    await requestFaucet(address);
    console.log("Waiting up to 3 minutes for faucet funds…");
    try {
      balance = await Rx.firstValueFrom(
        walletCtx.wallet.state().pipe(
          Rx.throttleTime(8000),
          Rx.filter((s) => s.isSynced),
          Rx.map((s) => s.unshielded.balances[unshieldedToken().raw] ?? 0n),
          Rx.filter((b) => b > 0n),
          Rx.timeout({ first: 180_000 }),
        ),
      );
      console.log(`Funds received: ${balance.toString()}`);
    } catch {
      writeDeployEvidence(
        "PENDING_PREVIEW_DEPLOY",
        address,
        "\n- **Blocker:** Preview faucet did not fund within 3 minutes (captcha/rate-limit). Re-run after manual faucet funding with `MIDNIGHT_SEED` set.\n",
      );
      await walletCtx.wallet.stop();
      console.error("Faucet wait timed out — evidence left as PENDING.");
      process.exit(2);
    }
  }

  // Register NIGHT for DUST if needed
  const dustState = await Rx.firstValueFrom(
    walletCtx.wallet.state().pipe(Rx.filter((s) => s.isSynced)),
  );
  if (dustState.dust.walletBalance(new Date()) === 0n) {
    const nightUtxos = dustState.unshielded.availableCoins.filter(
      (c: { meta?: { registeredForDustGeneration?: boolean } }) =>
        !c.meta?.registeredForDustGeneration,
    );
    if (nightUtxos.length > 0) {
      console.log("Registering NIGHT UTXOs for DUST generation…");
      const recipe = await walletCtx.wallet.registerNightUtxosForDustGeneration(
        nightUtxos,
        walletCtx.unshieldedKeystore.getPublicKey(),
        (payload: Uint8Array) => walletCtx.unshieldedKeystore.signData(payload),
      );
      await walletCtx.wallet.finalizeRecipe(recipe);
      console.log("Waiting for DUST accrual…");
      await Rx.firstValueFrom(
        walletCtx.wallet.state().pipe(
          Rx.throttleTime(10_000),
          Rx.filter((s) => s.isSynced),
          Rx.map((s) => s.dust.walletBalance(new Date())),
          Rx.filter((b) => b > 0n),
          Rx.timeout({ first: 300_000 }),
        ),
      ).catch(() => {
        console.warn("DUST still zero after wait — deploy may fail on fees.");
      });
    }
  }

  console.log("Building providers + deploying (proof server required on :6300)…");
  const providers = await createProviders(walletCtx);
  const deployed = await deployContract(providers, {
    compiledContract,
    privateStateId: "nightGatePrivateState",
    initialPrivateState: createPrivateState(0n),
  });

  const contractAddress = deployed.deployTxData.public.contractAddress;
  console.log(`Deployed NightGate at: ${contractAddress}`);
  writeDeployEvidence(contractAddress, address);

  await walletCtx.wallet.stop();
  console.log("=== Deploy complete ===\n");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
