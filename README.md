# NightGate

**Prove you meet an eligibility threshold without revealing the underlying private value.**

Public repo: https://github.com/manojaggarwal812/night-gate  
Live demo: https://night-gate-mauve.vercel.app

NightGate is a Midnight Compact contract + Lace frontend for threshold eligibility checks (age ≥ 18, score ≥ 70, membership tier ≥ X). The sensitive value stays in a private witness; observers only see whether the check passed, how many checks ran, and a commitment hash.

## Levels

| Level | Status |
|---|---|
| Level 1 — New Moon (compile, tests, Preview path) | Done |
| Level 2 — Waxing Crescent (Lace UI on Preprod, circuit call, live demo) | In progress / this README |

## Initial product idea

Apps constantly ask “is this user eligible?” — old enough, high enough score, paid enough tier — but putting the raw number on a public ledger leaks personal data. Zero-knowledge circuits can answer the boolean without disclosing the inputs.

NightGate models that pattern as a Compact contract with a thin Preprod frontend. A prover supplies a 32-byte private claim (first 8 bytes = little-endian `u64` score/age) plus a matching private circuit parameter. The circuit compares against threshold **18**, discloses only `eligible`, bumps a public counter, and stores `persistentHash(claim)`.

Under-threshold callers are **allowed**: the call succeeds with `eligible = false` so demos and tests stay simple. The UI clears the score field after a successful call so the private value is not left on screen.

## Public vs private

| Data | Visibility | Where it lives | Notes |
|---|---|---|---|
| Private claim (`Bytes<32>`) | **PRIVATE** (witness) | Prover / Lace session | First 8 bytes = LE `u64` score/age. Never cleartext on ledger. |
| Circuit `score` param | **PRIVATE** | Circuit witness | Must match claim encoding. |
| `eligible` | **PUBLIC** after `disclose()` | Ledger | Boolean `score >= 18`. |
| `checkCount` | **PUBLIC** | Ledger `Counter` | Increments on every `checkEligibility`. |
| `latestCommitment` | **PUBLIC** after `disclose()` | Ledger | `persistentHash(claim)` — commitment, not the value. |

## Architecture

```mermaid
flowchart LR
  Lace[Lace wallet Preprod]
  UI[NightGate web UI]
  Witness[Private claim Bytes32]
  Circuit[checkEligibility]
  Ledger[Public Preprod ledger]

  Lace --> UI
  UI --> Witness
  Witness --> Circuit
  Circuit -->|disclose eligible + commitment| Ledger
  Circuit -->|increment checkCount| Ledger
  Ledger --> UI
```

```mermaid
sequenceDiagram
  participant User
  participant Lace
  participant UI as NightGate UI
  participant Circuit as NightGate circuit
  participant Ledger as Preprod ledger

  User->>Lace: Connect on Preprod
  Lace->>UI: unshielded address
  User->>UI: private score input
  UI->>Circuit: checkEligibility private score
  Circuit->>Ledger: disclose eligible
  Circuit->>Ledger: bump checkCount
  Circuit->>Ledger: disclose persistentHash claim
  UI->>User: show public eligible count commitment only
```

## Requirements

- Node.js 22+
- Compact CLI `+0.31.1` (WSL on Windows: `npm run compile:wsl`)
- `@midnight-ntwrk/compact-runtime@0.16.0`, Midnight.js **4.1.1**
- Docker proof-server on `:6300` (Lace should point at the same prover URI)
- Lace (Midnight) browser extension on **Preprod**

## Quick start

```bash
npm install
npm run compile:wsl   # or npm run compile on Linux/macOS
npm test
npm run web:sync-zk
npm run web:dev
```

Open http://localhost:5173 — Connect Lace (Preprod) → Deploy or Join → enter private score → Call `checkEligibility`.

CLI deploy (optional; Lace UI deploy is preferred for Level 2):

```bash
docker compose up -d
MIDNIGHT_NETWORK=preprod MIDNIGHT_SEED=<64-hex> npm run deploy:preprod
```

## Project layout

```
night-gate/
  contracts/night-gate.compact
  contracts/managed/night-gate/
  web/                 # Vite + React Lace DApp
  src/                 # witnesses, deploy helpers
  tests/
  docs/evidence/
  docs/screenshots/
```

## Circuits

| Circuit | Purpose |
|---|---|
| `checkEligibility(score)` | Prove threshold; disclose eligible + commitment; bump count |
| `getCheckCount()` | Read public counter |
| `getEligible()` | Read public flag |
| `getLatestCommitment()` | Read commitment |

## Preprod contract address

See [docs/evidence/DEPLOYMENT.md](docs/evidence/DEPLOYMENT.md). After Lace deploy, set `VITE_CONTRACT_ADDRESS` for the live demo.

## Evidence checklist — Level 2 — Waxing Crescent

- [x] Lace connect / disconnect in UI
- [x] Circuit call path from frontend (`checkEligibility`)
- [x] Observable privacy behavior (public eligible/count/commitment only; score cleared after prove)
- [x] Preprod deploy path (CLI + Lace UI) documented; address recorded when available
- [x] Public GitHub repository + README privacy claim
- [x] Live demo (Vercel) — see `docs/evidence/LIVE_DEMO.md`
- [x] Demo video instructions — see `docs/evidence/DEMO_VIDEO.md`
- [x] Minimum 8 meaningful commits on `main`
- [x] Vitest suite still green (Level 1 contract tests)

## Level 1 checklist (still true)

- [x] Compact `+0.31.1` managed artifacts
- [x] Compile evidence under `docs/screenshots/`
- [x] ≥3 Vitest tests
- [x] MIT license

## License

MIT © 2026 Manoj Aggarwal

## Next: Level 3 — First Quarter

Richer wallet UX, monitoring, and hardened eligibility policies — not claimed here.
