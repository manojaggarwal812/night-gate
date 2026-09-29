/**
 * Midnight Preview network endpoints for Level 1 — New Moon.
 * Indexer uses GraphQL API v4 (required by midnight-js 4.x).
 */

export type MidnightNetwork = "preview" | "preprod" | "undeployed";

export type NetworkConfig = {
  network: MidnightNetwork;
  proofServerUrl: string;
  indexerUrl: string;
  indexerWsUrl: string;
  nodeUrl: string;
  faucetUrl: string;
};

const PREVIEW: NetworkConfig = {
  network: "preview",
  proofServerUrl: process.env.PROOF_SERVER_URL ?? "http://127.0.0.1:6300",
  indexerUrl: "https://indexer.preview.midnight.network/api/v4/graphql",
  indexerWsUrl: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
  nodeUrl: "https://rpc.preview.midnight.network",
  faucetUrl: "https://faucet.preview.midnight.network",
};

const PREPROD: NetworkConfig = {
  network: "preprod",
  proofServerUrl: process.env.PROOF_SERVER_URL ?? "http://127.0.0.1:6300",
  indexerUrl: "https://indexer.preprod.midnight.network/api/v4/graphql",
  indexerWsUrl: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
  nodeUrl: "https://rpc.preprod.midnight.network",
  faucetUrl: "https://faucet.preprod.midnight.network",
};

export function resolveNetwork(name?: string): NetworkConfig {
  const key = (name ?? process.env.MIDNIGHT_NETWORK ?? "preview").toLowerCase();
  if (key === "preprod") return PREPROD;
  return PREVIEW;
}

export const previewNetwork = PREVIEW;
