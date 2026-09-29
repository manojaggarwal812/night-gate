import { CompiledContract } from "@midnight-ntwrk/compact-js";
import {
  deployContract,
  findDeployedContract,
} from "@midnight-ntwrk/midnight-js-contracts";
import { Contract } from "@ng/contract";
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

export type DeployedNightGate = Awaited<
  ReturnType<typeof deployContract<typeof Contract>>
>;

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
  return { contract, address };
}

export async function joinNightGate(
  providers: NightGateProviders,
  contractAddress: string,
  privateState?: NightGatePrivateState,
): Promise<DeployedNightGate> {
  return findDeployedContract(providers, {
    contractAddress,
    compiledContract,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: privateState ?? createPrivateState(0n),
  });
}

export async function checkEligibility(
  contract: DeployedNightGate,
  score: bigint,
): Promise<{
  txHash?: string;
  public: PublicLedgerView;
}> {
  // Update local private claim before proving so witness matches score.
  // findDeployedContract / deployContract already hold private state; callTx
  // uses the stored private state + circuit param.
  const txData = await contract.callTx.checkEligibility(score);
  const pub = txData.public as {
    txHash?: string;
    txId?: string;
  };

  // After call, read public ledger via getters
  const eligibleTx = await contract.callTx.getEligible();
  const countTx = await contract.callTx.getCheckCount();
  const commitTx = await contract.callTx.getLatestCommitment();

  const commitment = commitTx.private.result as Uint8Array;
  return {
    txHash: pub.txHash ?? pub.txId,
    public: {
      eligible: Boolean(eligibleTx.private.result),
      checkCount: countTx.private.result as bigint,
      latestCommitmentHex: bytesToHex(commitment),
    },
  };
}

export async function readPublicState(
  contract: DeployedNightGate,
): Promise<PublicLedgerView> {
  const eligibleTx = await contract.callTx.getEligible();
  const countTx = await contract.callTx.getCheckCount();
  const commitTx = await contract.callTx.getLatestCommitment();
  return {
    eligible: Boolean(eligibleTx.private.result),
    checkCount: countTx.private.result as bigint,
    latestCommitmentHex: bytesToHex(commitTx.private.result as Uint8Array),
  };
}
