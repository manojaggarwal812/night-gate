# NightGate — deployment

| Field | Value |
|---|---|
| Network | Preprod (Level 2 — Waxing Crescent) |
| Contract address | `PENDING_PREPROD_DEPLOY` |
| Deployer | **1AM** UI (preferred) or `npm run deploy:preprod` |
| Timestamp (UTC) | 2026-09-29T19:50:00Z |
| Indexer | `https://indexer.preprod.midnight.network/api/v4/graphql` |
| Node / RPC | `https://rpc.preprod.midnight.network` |
| Faucet | `https://faucet.preprod.midnight.network` |
| Explorer | `https://explorer.preprod.midnight.network` |

## Status

Level 2 primary path: **1AM connect → Deploy to Preprod** on https://night-gate-mauve.vercel.app

- 1AM injects `window.midnight['1am']`
- 1AM typically sponsors proving/DUST via `getConfiguration().proverServerUri` (no local Docker required)
- CLI Node wallet sync timed out on Preprod RPC WS — not the recommended path for 1AM users

After a successful 1AM deploy, replace `PENDING_PREPROD_DEPLOY` with the live address and commit.
