# Code quality audit — Level 3

Date: 2026-09-30  
Scope: contract, witnesses, tests, providers, wallet bridge, UI, CI

## Deep audit findings

| Area | Finding | Severity | Action |
|---|---|---|---|
| Provider session | Fresh Level store per click dropped `setContractAddress` | High | Session-cached `getProviders()` |
| Join hang | `watchForDeployTxData` waits forever after later `ContractCall`s | High | HTTP `queryContractState` join path |
| Getter txs | Join called `getEligible`/etc via `callTx` (extra wallet proves) | High | Indexer `ledger()` read |
| Ledger WASM dupes | Multiple `ledger-v8` copies → `maintenanceAuthority` type error | High | Vite dedupe + npm overrides |
| Blank production UI | Node `events` externalized → `EventEmitter` undefined | High | Polyfill aliases |
| Proving path | HTTP proof URL fragile vs 1AM | Med | Prefer `dappConnectorProofProvider` |
| Mobile layout | Grid cramped on narrow viewports | Med | `@media (max-width: 720px)` rules |
| Wallet picker | Redundant `/1am/` name checks | Low | Simplified `selectWallet` |
| Witness coverage | Encoding only covered indirectly | Med | Added `tests/witnesses.test.ts` |
| CI | No workflow | High | `.github/workflows/ci.yml` |

## Standards followed

- No secrets in repo (seeds / `.env` gitignored)
- Privacy UX: score cleared after successful prove
- Single provider instance per wallet session
- Official Midnight provider stack (`network-id`, indexer, level, fetch zk, dapp proving)
- Meaningful commits on `main`

## Verification

```bash
npm test
npm run web:sync-zk
npm --prefix web run build
```

CI runs the same on every push to `main`.
