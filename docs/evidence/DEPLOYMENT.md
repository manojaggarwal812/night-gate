# NightGate — deployment

| Field | Value |
|---|---|
| Network | Preprod (Level 2 — Waxing Crescent) |
| Contract address | `17d06850fed3c49058994d4fced343144159b622579e63fc11e4132307948eef` |
| Deploy tx hash | `7bd6c5da8a3459b4ca34d28fce1512abb7ac9719d4935b3bec6b0e5683432f3d` |
| Block height | `2765705` |
| Block hash | `e9f64a2bf4762df2f277e8334b34a7328071370fc3faf673e1ae623edbdc531d` |
| Deployer | **1AM** UI on https://night-gate-mauve.vercel.app |
| Timestamp (UTC) | ~block time from indexer (verified 2026-09-29) |
| Indexer | `https://indexer.preprod.midnight.network/api/v4/graphql` |
| Node / RPC | `https://rpc.preprod.midnight.network` |
| Faucet | `https://faucet.preprod.midnight.network` |
| Explorer | `https://explorer.preprod.midnight.network` (UI often 404; prefer indexer) |

## Status

**On-chain deploy confirmed** via Preprod indexer `contractAction` → `ContractDeploy` for the address above.

Night Scan explorer pages (`/contract/...`, `/tx/...`, `/block/...`) currently return **404** even for known indexed objects — that is an explorer frontend issue, not a failed deploy.

### Indexer verification (GraphQL)

```graphql
query {
  contractAction(
    address: "17d06850fed3c49058994d4fced343144159b622579e63fc11e4132307948eef"
  ) {
    __typename
    ... on ContractDeploy {
      address
      transaction {
        hash
        block { height hash timestamp }
      }
    }
  }
}
```

POST to: `https://indexer.preprod.midnight.network/api/v4/graphql`
