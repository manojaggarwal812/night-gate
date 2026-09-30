import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@midnight-ntwrk/dapp-connector-api";
import { THRESHOLD } from "@ng/witnesses";
import { useMidnightWallet } from "./hooks/useLaceWallet";
import { clearProvidersCache, getProviders } from "./lib/providers";
import {
  checkEligibility,
  deployNightGate,
  joinNightGate,
  readPublicState,
  type PublicLedgerView,
} from "./lib/nightGateApi";
import { DEFAULT_CONTRACT_ADDRESS, PREPROD } from "./lib/config";
import "./styles.css";

function shortAddr(value: string): string {
  if (value.length < 20) return value;
  return `${value.slice(0, 10)}…${value.slice(-8)}`;
}

export default function App() {
  const wallet = useMidnightWallet();
  const [contractAddress, setContractAddress] = useState(DEFAULT_CONTRACT_ADDRESS);
  const [joined, setJoined] = useState(false);
  const [scoreInput, setScoreInput] = useState("21");
  const [ledger, setLedger] = useState<PublicLedgerView | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState("Connect 1AM on Preprod to begin.");
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revealedLocally, setRevealedLocally] = useState(false);
  const autoJoinTried = useRef(false);

  const thresholdLabel = useMemo(() => THRESHOLD.toString(), []);
  const walletLabel = wallet.walletName ?? "1AM";

  const requireApi = useCallback(() => {
    const session = wallet.session.current;
    if (!session) throw new Error("Connect 1AM first");
    return session.api;
  }, [wallet.session]);

  const doJoin = useCallback(
    async (address: string, silent = false) => {
      const trimmed = address.trim();
      if (!trimmed) {
        setActionError("Paste a Preprod contract address first.");
        return false;
      }
      if (!silent) {
        setActionBusy(true);
        setActionError(null);
        setStatus("Joining deployed NightGate (indexer only, no wallet tx)…");
      }
      try {
        const providers = await getProviders(requireApi());
        await joinNightGate(providers, trimmed);
        const view = await readPublicState(providers, trimmed);
        setLedger(view);
        setJoined(true);
        setContractAddress(trimmed);
        setStatus(`Joined ${shortAddr(trimmed)} — ready to call`);
        setActionError(null);
        return true;
      } catch (err) {
        setJoined(false);
        setActionError(err instanceof Error ? err.message : String(err));
        setStatus("Join failed.");
        return false;
      } finally {
        if (!silent) setActionBusy(false);
      }
    },
    [requireApi],
  );

  useEffect(() => {
    if (!wallet.connected) {
      autoJoinTried.current = false;
      setJoined(false);
      clearProvidersCache();
      setStatus("Connect 1AM on Preprod to begin.");
      return;
    }
    if (autoJoinTried.current || joined || !contractAddress.trim()) return;
    autoJoinTried.current = true;
    setStatus("Auto-joining Preprod contract…");
    void doJoin(contractAddress, true).then((ok) => {
      if (!ok) {
        setStatus("Connect OK — tap Join if auto-join failed.");
      }
    });
  }, [wallet.connected, contractAddress, joined, doJoin]);

  async function onDeploy() {
    setActionBusy(true);
    setActionError(null);
    setStatus("Deploying NightGate to Preprod (proving may take a minute)…");
    try {
      const providers = await getProviders(requireApi());
      const { address } = await deployNightGate(providers, 0n);
      const view = await readPublicState(providers, address);
      setLedger(view);
      setContractAddress(address);
      setJoined(true);
      setStatus(`Deployed on Preprod: ${address}`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      setStatus("Deploy failed.");
    } finally {
      setActionBusy(false);
    }
  }

  async function onJoin() {
    await doJoin(contractAddress, false);
  }

  async function onCheck() {
    const trimmed = contractAddress.trim();
    if (!trimmed) {
      setActionError("Paste a Preprod contract address first.");
      return;
    }
    const score = BigInt(scoreInput || "0");
    setActionBusy(true);
    setActionError(null);
    setRevealedLocally(true);
    setStatus("Proving eligibility without disclosing the private score…");
    try {
      const providers = await getProviders(requireApi());
      // Same provider instance for attach + call (fixes setContractAddress race).
      if (!joined) {
        setStatus("Attaching to contract, then proving…");
        await joinNightGate(providers, trimmed);
        setJoined(true);
      } else {
        providers.privateStateProvider.setContractAddress(trimmed);
      }

      const result = await checkEligibility(providers, trimmed, score);
      setLedger(result.public);
      setTxHash(result.txHash ?? null);
      setScoreInput("");
      setRevealedLocally(false);
      setStatus(
        result.public.eligible
          ? "Threshold met. Public ledger shows eligible=true — score stays private."
          : "Under threshold. Call allowed; eligible=false — score still private.",
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : String(err));
      setStatus("Circuit call failed.");
      setRevealedLocally(false);
    } finally {
      setActionBusy(false);
    }
  }

  function onDisconnect() {
    clearProvidersCache();
    setJoined(false);
    autoJoinTried.current = false;
    wallet.disconnect();
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand-mark">NightGate</div>
        <div className="wallet-actions">
          {wallet.connected && wallet.address ? (
            <span className="addr" title={wallet.address}>
              {shortAddr(wallet.address)}
            </span>
          ) : null}
          {wallet.connected ? (
            <button className="btn" type="button" onClick={onDisconnect}>
              Disconnect {walletLabel}
            </button>
          ) : (
            <button
              className="btn btn-accent"
              type="button"
              disabled={wallet.busy}
              onClick={() => void wallet.connect().catch(() => undefined)}
            >
              {wallet.busy ? "Connecting…" : "Connect 1AM"}
            </button>
          )}
        </div>
      </header>

      <section className="hero">
        <h1>NightGate</h1>
        <p>
          Prove you clear the eligibility threshold without putting the private
          score on the public ledger. Waxing Crescent — 1AM on Preprod.
        </p>
        <div className="cta-row">
          {!wallet.connected ? (
            <button
              className="btn btn-accent"
              type="button"
              disabled={wallet.busy}
              onClick={() => void wallet.connect().catch(() => undefined)}
            >
              Connect 1AM on Preprod
            </button>
          ) : (
            <button
              className="btn btn-accent"
              type="button"
              disabled={actionBusy}
              onClick={() => void onDeploy()}
            >
              Deploy to Preprod
            </button>
          )}
        </div>
        {wallet.error ? <p className="err">{wallet.error}</p> : null}
      </section>

      <div className="grid">
        <section className="panel">
          <h2>Private check</h2>
          <p className="lede">
            Enter a score locally. The circuit compares it to threshold{" "}
            <strong>{thresholdLabel}</strong>. Only the boolean, counter, and
            commitment become public.
          </p>
          <div className="field">
            <label htmlFor="contract">Contract address</label>
            <input
              id="contract"
              value={contractAddress}
              onChange={(e) => {
                setContractAddress(e.target.value);
                setJoined(false);
                autoJoinTried.current = false;
              }}
              placeholder="Preprod contract address"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="score">
              Private score (never written cleartext on-chain)
            </label>
            <input
              id="score"
              inputMode="numeric"
              value={scoreInput}
              onChange={(e) =>
                setScoreInput(e.target.value.replace(/[^\d]/g, ""))
              }
              placeholder={`e.g. ${thresholdLabel} or higher`}
            />
          </div>
          <div className="cta-row">
            <button
              className="btn"
              type="button"
              disabled={!wallet.connected || actionBusy}
              onClick={() => void onJoin()}
            >
              {joined ? "Re-join" : "Join contract"}
            </button>
            <button
              className="btn btn-accent"
              type="button"
              disabled={!wallet.connected || actionBusy || !contractAddress.trim()}
              onClick={() => void onCheck()}
            >
              Call checkEligibility
            </button>
          </div>
          {joined ? (
            <p className="note">
              Joined — Call checkEligibility needs one wallet confirm for prove/submit.
            </p>
          ) : null}
          {revealedLocally ? (
            <p className="note">
              Proving… private score held only in this session.
            </p>
          ) : null}
          {actionError ? <p className="err">{actionError}</p> : null}
          <p className="status-line">{status}</p>
        </section>

        <section className="panel">
          <h2>Public ledger view</h2>
          <p className="lede">
            What observers can see after disclose — never the underlying score.
          </p>
          <div className="meta">
            <div>
              <span>eligible</span>
              <span>
                {ledger ? (
                  <span className={`badge ${ledger.eligible ? "pass" : "fail"}`}>
                    {ledger.eligible ? "true" : "false"}
                  </span>
                ) : (
                  "—"
                )}
              </span>
            </div>
            <div>
              <span>checkCount</span>
              <span>{ledger ? ledger.checkCount.toString() : "—"}</span>
            </div>
            <div>
              <span>latestCommitment</span>
              <span>
                {ledger
                  ? `${ledger.latestCommitmentHex.slice(0, 18)}…`
                  : "—"}
              </span>
            </div>
            <div>
              <span>last tx</span>
              <span>{txHash ? shortAddr(txHash) : "—"}</span>
            </div>
            <div>
              <span>network</span>
              <span>Preprod</span>
            </div>
          </div>
          {contractAddress ? (
            <p className="note">
              Indexer-verified address (explorer UI may 404):{" "}
              <code>{shortAddr(contractAddress)}</code>
            </p>
          ) : null}
        </section>
      </div>

      <section className="privacy">
        <h2>Privacy claim</h2>
        <p className="lede">
          Observable behavior: the UI and public ledger show eligibility, never
          the private score.
        </p>
        <table>
          <tbody>
            <tr>
              <th>PRIVATE</th>
              <td>
                32-byte claim (LE u64 score in first 8 bytes) + circuit{" "}
                <code>score</code> parameter — witness only
              </td>
            </tr>
            <tr>
              <th>PUBLIC</th>
              <td>
                <code>eligible</code>, <code>checkCount</code>,{" "}
                <code>latestCommitment = persistentHash(claim)</code>
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <footer className="footer">
        <span>NightGate · Level 2 — Waxing Crescent</span>
        <span>
          Faucet:{" "}
          <a href={PREPROD.faucetUrl} target="_blank" rel="noreferrer">
            Preprod
          </a>
        </span>
      </footer>
    </div>
  );
}
