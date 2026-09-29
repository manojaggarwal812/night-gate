# Code quality audit — Level 2

Date: 2026-09-29  
Scope: NightGate contract, witnesses, tests, deploy helpers, Lace web UI

## Findings & fixes

| Area | Finding | Action |
|---|---|---|
| Witness encoding | Domain tag overflowed 32-byte claim (`nightgate` @ offset 24) | Fixed to 8-byte `NightGat` tag |
| Deploy defaults | Defaulted to Preview after Level 1 | Level 2 defaults to Preprod; scripts for both networks |
| Lace bridge | Needed WalletProvider shape for midnight-js 4.1.1 | `web/src/lib/walletAdapter.ts` balances/submits via ConnectedAPI |
| Indexer WS in browser | `isomorphic-ws` WebSocket undefined in Vite | Pass native `WebSocket` into `indexerPublicDataProvider` |
| ZK assets for browser | FetchZkConfigProvider expects `/keys` + `/zkir` | `npm run web:sync-zk` + `web/public/zk/night-gate` |
| Secrets | Seeds / `.env` | Gitignored; never committed |
| Privacy UX | Score could linger in input after prove | Cleared after successful `checkEligibility` |
| Tests | Runtime + artifact coverage | 6 Vitest tests green |
| Branding | Distinct from attestation clones | NightGate eligibility-gate metaphor; Fraunces/Manrope |

## Remaining risks (documented, not blockers for checklist wiring)

1. **Preprod CLI wallet sync** may hang on public RPC WS — Lace UI deploy is the supported Level 2 path.
2. **Live circuit call** requires funded Lace + local/proof-server URI configured in the wallet.
3. **Demo video** must be recorded by the submitter with Lace installed.
4. Bundle size is large (ledger WASM) — acceptable for Level 2; code-split later.

## Verification commands

```bash
npm test
npm run web:build
```
