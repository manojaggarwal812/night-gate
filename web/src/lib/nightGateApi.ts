import { CompiledContract } from "@midnight-ntwrk/compact-js";
import {
  createCircuitCallTxInterface,
  deployContract,
  verifyContractState,
} from "@midnight-ntwrk/midnight-js-contracts";
import { ContractExecutable } from "@midnight-ntwrk/midnight-js-protocol/compact-js";
import { sampleSigningKey } from "@midnight-ntwrk/midnight-js-protocol/compact-runtime";
import { Contract, ledger } from "@ng/contract";
import {
  createPrivateState,
  PRIVATE_STATE_ID,
  witnesses,
  bytesToHex,
  type NightGatePrivateState,
} from "@ng/witnesses";
import type { NightGateProviders } from "./providers";

export type PublicLedgerView = {
  eligible: boolean;
  checkCount: bigint;
  latestCommitmentHex: string;
};

const compiledContract = CompiledContract.make("night-gate", Contract).pipe(
  CompiledContract.withWitnesses(witnesses as never),
);

export type DeployedNightGate = {
  deployTxData: {
    private: {
      signingKey: string;
      initialPrivateState: NightGatePrivateState;
    };
    public: {
      contractAddress: string;
      initialContractState: unknown;
    };
  };
  callTx: ReturnType<typeof createCircuitCallTxInterface>;
};

function bindPrivateState(
  providers: NightGateProviders,
  contractAddress: string,
): void {
  providers.privateStateProvider.setContractAddress(contractAddress);
}

function makeCallTx(providers: NightGateProviders, contractAddress: string) {
  // createCircuitCallTxInterface also calls setContractAddress
  return createCircuitCallTxInterface(
    providers,
    compiledContract,
    contractAddress,
    PRIVATE_STATE_ID,
  );
}

export async function deployNightGate(
  providers: NightGateProviders,
  scoreForInitialState = 0n,
): Promise<{ contract: DeployedNightGate; address: string }> {
  const contract = await deployContract(providers, {
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: createPrivateState(scoreForInitialState),
  });
  const address = contract.deployTxData.public.contractAddress;
  bindPrivateState(providers, address);
  return {
    contract: {
      ...(contract as unknown as DeployedNightGate),
      callTx: makeCallTx(providers, address),
    },
    address,
  };
}

/**
 * Attach to an already-deployed Preprod contract.
 * Uses HTTP indexer queries (no watchForDeployTxData hang after later calls).
 */
export async function joinNightGate(
  providers: NightGateProviders,
  contractAddress: string,
  privateState?: NightGatePrivateState,
): Promise<DeployedNightGate> {
  const address = contractAddress.trim();
  if (!address) throw new Error("Contract address required");

  bindPrivateState(providers, address);

  const currentContractState =
    await providers.publicDataProvider.queryContractState(address);
  if (!currentContractState) {
    throw new Error(`No contract found on Preprod at ${address}`);
  }

  const initialContractState =
    (await providers.publicDataProvider.queryDeployContractState(address)) ??
    currentContractState;

  const circuitIds =
    ContractExecutable.make(compiledContract).getProvableCircuitIds();
  const verifierKeys =
    await providers.zkConfigProvider.getVerifierKeys(circuitIds);
  verifyContractState(verifierKeys, currentContractState);

  const existingKey =
    await providers.privateStateProvider.getSigningKey(address);
  const signingKey = existingKey ?? sampleSigningKey();
  if (!existingKey) {
    await providers.privateStateProvider.setSigningKey(address, signingKey);
  }

  const initialPrivateState = privateState ?? createPrivateState(0n);
  await providers.privateStateProvider.set(
    PRIVATE_STATE_ID,
    initialPrivateState,
  );

  return {
    deployTxData: {
      private: { signingKey, initialPrivateState },
      public: { contractAddress: address, initialContractState },
    },
    callTx: makeCallTx(providers, address),
  };
}

/** Public ledger via indexer HTTP — no wallet / prove txs. */
export async function readPublicState(
  providers: NightGateProviders,
  contractAddress: string,
): Promise<PublicLedgerView> {
  const state =
    await providers.publicDataProvider.queryContractState(contractAddress);
  if (!state) {
    throw new Error(`No contract state at ${contractAddress}`);
  }
  const view = ledger(state.data);
  return {
    eligible: Boolean(view.eligible),
    checkCount: view.checkCount as bigint,
    latestCommitmentHex: bytesToHex(view.latestCommitment as Uint8Array),
  };
}

/**
 * Prove + submit checkEligibility, then refresh public view from indexer.
 * Always re-binds contract address + rebuilds callTx on the *same* providers.
 */
export async function checkEligibility(
  providers: NightGateProviders,
  contractAddress: string,
  score: bigint,
): Promise<{
  txHash?: string;
  public: PublicLedgerView;
}> {
  const address = contractAddress.trim();
  if (!address) throw new Error("Contract address required");

  bindPrivateState(providers, address);
  await providers.privateStateProvider.set(
    PRIVATE_STATE_ID,
    createPrivateState(score),
  );

  const before = await readPublicState(providers, address);
  const callTx = makeCallTx(providers, address);
  const txData = await callTx.checkEligibility(score);
  const pub = txData.public as { txHash?: string; txId?: string };

  // Indexer can lag briefly after submit — poll until checkCount moves.
  let publicView = before;
  for (let i = 0; i < 8; i++) {
    await new Promise((r) => setTimeout(r, 1200));
    publicView = await readPublicState(providers, address);
    if (publicView.checkCount !== before.checkCount) break;
  }

  return {
    txHash: pub.txHash ?? pub.txId,
    public: publicView,
  };
}
