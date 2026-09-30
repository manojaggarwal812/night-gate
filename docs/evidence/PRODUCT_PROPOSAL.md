# Product / Idea proposal — NightGate

**Chosen idea (from provided list):** Age / Eligibility Gate — prove a threshold without revealing the underlying value  
**Product name:** NightGate  
**Author:** Manoj Aggarwal (`manojaggarwal812`)  
**Challenge period:** September Challenge (Active)  
**Network:** Midnight Preprod  
**Track category for form:** **Identity/credentials**

---

## Copy-paste for 💭 Idea Submission form

### Question 1 — What is your idea?

```
NightGate — Age / Eligibility Gate on Midnight.

I am building (and already ship on Preprod) a privacy-first eligibility gate: a user proves they meet a numeric threshold (age ≥ 18, score ≥ N, membership tier) without revealing the underlying private value on the public ledger.

How it works:
• Private: 32-byte witness claim (LE u64 score/age) + private circuit parameter `score`
• Public (selective disclosure): eligible boolean, checkCount, latestCommitment = persistentHash(claim)
• Wallet: 1AM on Preprod; proving via dapp-connector proof provider
• Live dApp: https://night-gate-mauve.vercel.app
• Repo: https://github.com/manojaggarwal812/night-gate
• Contract: 17d06850fed3c49058994d4fced343144159b622579e63fc11e4132307948eef
• Demo video: https://drive.google.com/file/d/1JluSV3vShfEw2ko9q_1sD74GL8mNO3Uj/view?usp=sharing

For Level 4–6 I will harden NightGate into a production-grade eligibility product: stronger wallet UX, multi-threshold policies, monitoring, and clearer selective-disclosure flows aligned with Midnight’s identity/credentials track — without ever putting the raw age/score on-chain.
```

### Question 2 — Choose a category

**Identity/credentials**

(Alternative acceptable if the form forces a list pick: this maps directly to **Age / Eligibility Gate** on the Provided Idea List.)

### Submission period

**September Challenge** — Active

---

## Problem

Apps constantly ask “are you eligible?” (age ≥ 18, score ≥ threshold, membership tier). Putting the raw number on a public ledger leaks personal data. Midnight’s selective disclosure lets a prover answer the boolean without revealing the underlying value.

## Solution (ships today)

- Compact circuit `checkEligibility` + getters  
- 1AM browser UI with Connect / Join / Call  
- CI + Vitest (10 tests) + Vercel live demo  
- Privacy model documented in README  

## Level 4–6 direction (after idea approval)

| Phase | Focus |
|---|---|
| Level 4 | Richer UX, error recovery, multi-threshold / policy configs |
| Level 5 | Monitoring, hardened ops, clearer observer guarantees |
| Level 6 | Supermoon polish toward a reusable eligibility SDK / product |

## Links

| Resource | URL |
|---|---|
| Repo | https://github.com/manojaggarwal812/night-gate |
| Live demo | https://night-gate-mauve.vercel.app |
| Demo video | https://drive.google.com/file/d/1JluSV3vShfEw2ko9q_1sD74GL8mNO3Uj/view?usp=sharing |
| Contract | `17d06850fed3c49058994d4fced343144159b622579e63fc11e4132307948eef` |
| Midnight RFS | https://midnight.network/request-for-start-ups |

## Approval ask

Please approve **Age / Eligibility Gate — NightGate** under **Identity/credentials** for the September challenge Idea Submission (Level 4–6 scope).
