# Product proposal — Level 3 (First Quarter)

**Chosen idea (from provided list):** Age / Eligibility Gate  
**Product name:** NightGate  
**Author:** Manoj Aggarwal (`manojaggarwal812`)  
**Network:** Midnight Preprod  
**Status:** Ready for approval / builds on completed Level 2

## Problem

Apps constantly ask “are you eligible?” (age ≥ 18, score ≥ threshold, membership tier). Putting the raw number on a public ledger leaks personal data. Midnight’s selective disclosure lets a prover answer the boolean without revealing the underlying value.

## Solution

NightGate is a Compact circuit + 1AM browser dApp:

- Private witness: 32-byte claim (LE `u64` score/age + domain tag)
- Private circuit parameter: `score`
- Public disclose: `eligible`, `checkCount`, `latestCommitment = persistentHash(claim)`
- Under-threshold calls are allowed (`eligible=false`) so demos stay simple without abort paths

## Why this idea fits First Quarter

| Criterion | NightGate |
|---|---|
| Selective disclosure | Only boolean + count + commitment public |
| Production polish | Vitest suite, GitHub Actions CI, Vercel live demo |
| Realistic product | Age / KYC-lite / loyalty tier gate reusable pattern |
| Wallet + private state | 1AM connect, Level private-state store, dapp-connector proving |

## Scope for this cycle

1. Keep Preprod contract + live UI production-usable  
2. ≥3 automated tests (contract + witness) in CI on every push  
3. Document privacy model for observers  
4. 1-minute demo video of Connect → Call → public panel  

Out of scope (later): multi-threshold policies, admin allowlists, mainnet.

## Links

| Resource | URL |
|---|---|
| Repo | https://github.com/manojaggarwal812/night-gate |
| Live demo | https://night-gate-mauve.vercel.app |
| Contract | `17d06850fed3c49058994d4fced343144159b622579e63fc11e4132307948eef` |

## Approval ask

Please approve **Age / Eligibility Gate — NightGate** as the Level 3 product proposal.
