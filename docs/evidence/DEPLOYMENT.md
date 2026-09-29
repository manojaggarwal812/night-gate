# NightGate — deployment

| Field | Value |
|---|---|
| Network | Preprod (Level 2 — Waxing Crescent) |
| Contract address | `PENDING_PREPROD_DEPLOY` |
| Deployer | Lace UI or `npm run deploy:preprod` |
| Timestamp (UTC) | 2026-09-29T19:40:00Z |
| Indexer | `https://indexer.preprod.midnight.network/api/v4/graphql` |
| Node / RPC | `https://rpc.preprod.midnight.network` |
| Faucet | `https://faucet.preprod.midnight.network` |
| Explorer | `https://explorer.preprod.midnight.network` |

## Status

Level 2 primary path is **Lace connect → Deploy to Preprod** in the web UI (proof server required).

CLI `npm run deploy:preprod` is available; Node wallet sync may hang on public RPC WebSockets — prefer Lace.

After a successful deploy, replace `PENDING_PREPROD_DEPLOY` with the hex/bech32 contract address and commit evidence.

## Preview (Level 1)

Earlier Preview attempts recorded RPC disconnect during wallet sync — see git history / prior `preview-deploy.txt` if present.
