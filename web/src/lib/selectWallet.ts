import type { InitialAPI } from "@midnight-ntwrk/dapp-connector-api";

export function listWallets(): InitialAPI[] {
  const injected = window.midnight;
  return injected ? Object.values(injected) : [];
}

export function selectWallet(): InitialAPI {
  const wallets = listWallets();
  if (wallets.length === 0) {
    throw new Error(
      "No Midnight wallet found. Install Lace (Midnight) and refresh.",
    );
  }
  // Prefer Lace if present among injected wallets
  const lace = wallets.find((w) => /lace/i.test(w.name) || /lace/i.test(w.rdns));
  return lace ?? wallets[0]!;
}
