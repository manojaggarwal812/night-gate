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
  return { contract: contract as unknown as DeployedNightGate, address };
}

/**
 * Join without `watchForDeployTxData` (that poll hangs once the latest
 * indexer action is a ContractCall instead of ContractDeploy).
 * Reads state over HTTP query and builds the call interface locally.
 */
export async function joinNightGate(
  providers: NightGateProviders,
  contractAddress: string,
  privateState?: NightGatePrivateState,
): Promise<DeployedNightGate> {
  const address = contractAddress.trim();
  if (!address) throw new Error("Contract address required");

  providers.privateStateProvider.setContractAddress(address);

  const currentContractState =
    await providers.publicDataProvider.queryContractState(address);
  if (!currentContractState) {
    throw new Error(`No contract found on Preprod at ${address}`);
  }

  const initialContractState =
    (await providers.publicDataProvider.queryDeployContractState(address)) ??
    currentContractState;

  const circuitIds = ContractExecutable.make(compiledContract).getProvableCircuitIds();
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
      private: {
        signingKey,
        initialPrivateState,
      },
      public: {
        contractAddress: address,
        initialContractState,
      },
    },
    callTx: createCircuitCallTxInterface(
      providers,
      compiledContract,
      address,
      PRIVATE_STATE_ID,
    ),
  };
}

/** Public ledger snapshot via indexer HTTP — no wallet / prove txs. */
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

export async function checkEligibility(
  providers: NightGateProviders,
  contract: DeployedNightGate,
  score: bigint,
): Promise<{
  txHash?: string;
  public: PublicLedgerView;
}> {
  const address = contract.deployTxData.public.contractAddress;
  // Keep witness claim in sync with the private score parameter.
  await providers.privateStateProvider.set(
    PRIVATE_STATE_ID,
    createPrivateState(score),
  );

  const txData = await contract.callTx.checkEligibility(score);
  const pub = txData.public as {
    txHash?: string;
    txId?: string;
  };

  const publicView = await readPublicState(providers, address);
  return {
    txHash: pub.txHash ?? pub.txId,
    public: publicView,
  };
}
