import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { dappConnectorProofProvider } from "@midnight-ntwrk/midnight-js-dapp-connector-proof-provider";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import { CostModel } from "@midnight-ntwrk/midnight-js-protocol/ledger";
import type {
  MidnightProviders,
  ProofProvider,
} from "@midnight-ntwrk/midnight-js-types";
import { createWalletProvidersFromConnector } from "./walletAdapter";
import { PREPROD, ZK_ASSET_BASE } from "./config";

export type NightGateProviders = MidnightProviders<string, string, unknown>;

type CacheEntry = {
  api: ConnectedAPI;
  providers: NightGateProviders;
};

let cache: CacheEntry | null = null;

async function buildProofProvider(
  api: ConnectedAPI,
  zkConfigProvider: FetchZkConfigProvider<string>,
): Promise<{ proofProvider: ProofProvider; mode: "1am" | "http" }> {
  // Prefer wallet-sponsored proving (1AM getProvingProvider).
  try {
    if (typeof api.getProvingProvider === "function") {
      const proofProvider = await dappConnectorProofProvider(
        api,
        zkConfigProvider,
        CostModel.initialCostModel(),
      );
      return { proofProvider, mode: "1am" };
    }
  } catch (err) {
    console.warn(
      "[NightGate] dappConnectorProofProvider unavailable, falling back to HTTP proof server:",
      err,
    );
  }

  const config = await api.getConfiguration();
  const proofUrl = config.proverServerUri || PREPROD.proofServerUrl;
  return {
    proofProvider: httpClientProofProvider(proofUrl, zkConfigProvider),
    mode: "http",
  };
}

/**
 * One provider set per wallet session.
 * Creating a fresh Level private-state provider per click drops setContractAddress()
 * and breaks Join → Call.
 */
export async function getProviders(
  api: ConnectedAPI,
): Promise<NightGateProviders> {
  if (cache?.api === api) return cache.providers;

  const config = await api.getConfiguration();
  const indexer = config.indexerUri || PREPROD.indexerUrl;
  const indexerWs = config.indexerWsUri || PREPROD.indexerWsUrl;

  const zkConfigProvider = new FetchZkConfigProvider<string>(
    `${window.location.origin}${ZK_ASSET_BASE}`,
    fetch.bind(window),
  );

  const { proofProvider, mode } = await buildProofProvider(
    api,
    zkConfigProvider,
  );
  console.info(`[NightGate] proof provider mode: ${mode}`);

  const shielded = await api.getShieldedAddresses();
  const { walletProvider, midnightProvider } =
    createWalletProvidersFromConnector(api, shielded);

  const providers: NightGateProviders = {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: "night-gate-web",
      accountId: shielded.shieldedAddress,
      privateStoragePasswordProvider: () => "NightGate-Web-Store-Key!",
    }),
    publicDataProvider: indexerPublicDataProvider(
      indexer,
      indexerWs,
      typeof WebSocket !== "undefined" ? WebSocket : undefined,
    ),
    zkConfigProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
  };

  cache = { api, providers };
  return providers;
}

export function clearProvidersCache(): void {
  cache = null;
}

/** @deprecated use getProviders */
export const buildProviders = getProviders;
