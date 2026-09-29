import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { useCallback, useRef, useState } from "react";
import { NETWORK_ID } from "../lib/config";
import { selectWallet } from "../lib/selectWallet";

export type WalletSession = {
  api: ConnectedAPI;
  unshieldedAddress: string;
  networkId: string;
};

export function useLaceWallet() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const session = useRef<WalletSession | null>(null);

  const connect = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      setNetworkId(NETWORK_ID);
      const wallet = selectWallet();
      const api = await wallet.connect(NETWORK_ID);
      try {
        await api.hintUsage([
          "getUnshieldedAddress",
          "getShieldedAddresses",
          "getConfiguration",
          "balanceUnsealedTransaction",
          "submitTransaction",
          "getConnectionStatus",
        ]);
      } catch {
        // Optional on some Lace builds
      }
      const { unshieldedAddress } = await api.getUnshieldedAddress();
      const status = await api.getConnectionStatus();
      if (status.status !== "connected") {
        throw new Error("Wallet did not report connected status");
      }
      session.current = {
        api,
        unshieldedAddress,
        networkId: status.networkId,
      };
      setAddress(unshieldedAddress);
      setConnected(true);
    } catch (err) {
      setConnected(false);
      setAddress(null);
      session.current = null;
      setError(err instanceof Error ? err.message : String(err));
      throw err;
    } finally {
      setBusy(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    session.current = null;
    setConnected(false);
    setAddress(null);
    setError(null);
  }, []);

  return {
    connected,
    address,
    busy,
    error,
    session,
    connect,
    disconnect,
  };
}
