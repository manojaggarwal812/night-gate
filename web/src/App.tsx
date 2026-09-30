import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "@midnight-ntwrk/dapp-connector-api";
import { THRESHOLD } from "@ng/witnesses";
import { useMidnightWallet } from "./hooks/useLaceWallet";
import { buildProviders } from "./lib/providers";
import {
  checkEligibility,
  deployNightGate,
  joinNightGate,
  readPublicState,
  type DeployedNightGate,
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
  const [deployed, setDeployed] = useState<DeployedNightGate | null>(null);
  const [scoreInput, setScoreInput] = useState("21");
  const [ledger, setLedger] = useState<PublicLedgerView | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [status, setStatus] = useState<string>(
    "Connect 1AM on Preprod to begin.",
  );
  const [actionBusy, setActionBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [revealedLocally, setRevealedLocally] = useState(false);
  const autoJoinTried = useRef(false);

  const thresholdLabel = useMemo(() => THRESHOLD.toString(), []);
  const walletLabel = wallet.walletName ?? "1AM";

  async function withProviders<T>(
    fn: (
      providers: Awaited<ReturnType<typeof buildProviders>>,
    ) => Promise<T>,
  ): Promise<T> {
    const session = wallet.session.current;
    if (!session) throw new Error("Connect 1AM first");
    const providers = await buildProviders(session.api);
    return fn(providers);
  }

  const doJoin = useCallback(
    async (address: string, silent = false) => {
      if (!address.trim()) {
        setActionError("Paste a Preprod contract address first.");
        return null;
      }
      if (!silent) {
        setActionBusy(true);
        setActionError(null);
        setStatus("Joining deployed NightGate (no wallet txs)…");
      }
      try {
        const contract = await withProviders(async (p) => {
          const joined = await joinNightGate(p, address.trim());
          const view = await readPublicState(p, address.trim());
          setLedger(view);
          return joined;
        });
        setDeployed(contract);
        setContractAddress(address.trim());
        setStatus(`Joined ${shortAddr(address.trim())} — ready to call`);
        return contract;
      } catch (err) {
        setActionError(err instanceof Error ? err.message : String(err));
        setStatus("Join failed.");
        return null;
      } finally {
        if (!silent) setActionBusy(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps -- withProviders uses wallet.session
    [wallet.connected],
  );

  // Auto-join known Preprod contract after wallet connect.
  useEffect(() => {
    if (!wallet.connected) {
      autoJoinTried.current = false;
      setDeployed(null);
      return;
    }
    if (autoJoinTried.current || deployed || !contractAddress.trim()) return;
    autoJoinTried.current = true;
    setStatus("Auto-joining Preprod contract…");
    void doJoin(contractAddress, true).then((joined) => {
      if (!joined) {
        setStatus("Connect OK — tap Join contract if auto-join failed.");
      }
    });
  }, [wallet.connected, contractAddress, deployed, doJoin]);

  async function onDeploy() {
    setActionBusy(true);
    setActionError(null);
    setStatus("Deploying NightGate to Preprod (proving may take a minute)…");
    try {
      const { contract, address } = await withProviders(async (p) => {
        const result = await deployNightGate(p, 0n);
        const view = await readPublicState(p, result.address);
        setLedger(view);
        return result;
      });
      setDeployed(contract);
      setContractAddress(address);
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
    const score = BigInt(scoreInput || "0");
    setActionBusy(true);
    setActionError(null);
    setRevealedLocally(true);
    setStatus("Proving eligibility without disclosing the private score…");
    try {
      let contract = deployed;
      if (!contract) {
        setStatus("Joining first, then proving…");
        contract = await doJoin(contractAddress, true);
        if (!contract) throw new Error("Join failed — cannot call circuit");
      }
      const result = await withProviders((p) =>
        checkEligibility(p, contract!, score),
      );
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
            <button className="btn" type="button" onClick={wallet.disconnect}>
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
                setDeployed(null);
                autoJoinTried.current = false;
              }}
              placeholder="Preprod contract address"
              spellCheck={false}
            />
          </div>
          <div className="field">
            <label htmlFor="score">Private score (never written cleartext on-chain)</label>
            <input
              id="score"
              inputMode="numeric"
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value.replace(/[^\d]/g, ""))}
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
              {deployed ? "Re-join" : "Join contract"}
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
          {deployed ? (
            <p className="note">Joined — Call checkEligibility needs one wallet confirm.</p>
          ) : null}
          {revealedLocally ? (
            <p className="note">Proving… private score held only in this session.</p>
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
