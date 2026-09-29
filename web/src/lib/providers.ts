import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { levelPrivateStateProvider } from "@midnight-ntwrk/midnight-js-level-private-state-provider";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { FetchZkConfigProvider } from "@midnight-ntwrk/midnight-js-fetch-zk-config-provider";
import { httpClientProofProvider } from "@midnight-ntwrk/midnight-js-http-client-proof-provider";
import type { MidnightProviders } from "@midnight-ntwrk/midnight-js-types";
import { createWalletProvidersFromConnector } from "./walletAdapter";
import { PREPROD, ZK_ASSET_BASE } from "./config";

export type NightGateProviders = MidnightProviders<
  string,
  string,
  unknown
>;

export async function buildProviders(
  api: ConnectedAPI,
): Promise<NightGateProviders> {
  const config = await api.getConfiguration();
  const indexer = config.indexerUri || PREPROD.indexerUrl;
  const indexerWs = config.indexerWsUri || PREPROD.indexerWsUrl;
  // 1AM usually supplies its own sponsored prover URI here
  const proofUrl =
    config.proverServerUri || PREPROD.proofServerUrl;

  const zkConfigProvider = new FetchZkConfigProvider<string>(
    `${window.location.origin}${ZK_ASSET_BASE}`,
    fetch.bind(window),
  );

  const shielded = await api.getShieldedAddresses();
  const { walletProvider, midnightProvider } =
    createWalletProvidersFromConnector(api, shielded);

  return {
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
    proofProvider: httpClientProofProvider(proofUrl, zkConfigProvider),
    walletProvider,
    midnightProvider,
  };
}
