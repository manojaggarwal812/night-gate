# NightGate — Preview deployment

| Field | Value |
|---|---|
| Network | Preview (Level 1 — New Moon) |
| Contract address | `PENDING_PREVIEW_DEPLOY` |
| Deployer unshielded (sample from wiring) | Generated at runtime via `npm run deploy:preview` (see attempt log) |
| Timestamp (UTC) | 2026-09-29T18:52:00Z |
| Proof server | `http://127.0.0.1:6300` (healthy locally) |
| Indexer | `https://indexer.preview.midnight.network/api/v4/graphql` (height ~1081095) |
| Node / RPC | `https://rpc.preview.midnight.network` |
| Faucet | `https://faucet.preview.midnight.network` |

## Status

**Preview path is wired** (`src/deploy.ts`, `src/network.ts`, `src/utils.ts`, Docker proof-server).

Live submit is **blocked** on Preview wallet sync: after `WalletFacade.init` + `start`, the node WebSocket to `wss://rpc.preview.midnight.network` repeatedly reports:

```
RPC-CORE: subscribeRuntimeVersion(): RuntimeVersion:: disconnected from wss://rpc.preview.midnight.network/: 1000:: Normal Closure
```

Wallet creation itself succeeds and prints an `mn_addr_preview…` unshielded address, but `waitForSyncedState()` / `isSynced` never completes within several minutes, so faucet funding + `deployContract` cannot finish.

Level 1 still ships compile artifacts, Vitest (≥3), deploy scripts, and this evidence. Re-run after Preview RPC/sync recovers:

```bash
docker compose up -d
# fund via https://faucet.preview.midnight.network with the printed mn_addr_preview…
MIDNIGHT_SEED=<64-hex> npm run deploy:preview
```

Preprod was **not** used as primary evidence (Level 1 = Preview).

## Notes

- Secrets (seeds) are never committed. Use `.env` locally only.
- Proof-server health check returned `{"status":"ok"}` on `:6300` during this attempt.

## Log snippet

```
NightGate deploy target: Preview
Managed artifacts OK
WalletFacade.init succeeded
Unshielded address printed (mn_addr_preview…)
RPC disconnect loop on wss://rpc.preview.midnight.network
Contract: PENDING_PREVIEW_DEPLOY
At: 2026-09-29T18:52:00Z
```

See also: `docs/evidence/preview-deploy-attempt.txt`, `docs/screenshots/deploy-evidence.html`.
