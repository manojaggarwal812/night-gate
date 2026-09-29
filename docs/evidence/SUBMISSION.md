# NightGate — Level 2 submission status

| Requirement | Status | Evidence |
|---|---|---|
| Wallet connect / disconnect | Done (1AM preferred) | `web/src/lib/selectWallet.ts`, UI topbar |
| Circuit called from frontend | Done | `web/src/lib/nightGateApi.ts` → `checkEligibility` |
| Observable privacy behavior | Done | Public panel + score cleared after prove; privacy table |
| Preprod contract address | Done | `17d06850…948eef` — see `DEPLOYMENT.md` / README |
| Public GitHub | Done | https://github.com/manojaggarwal812/night-gate |
| Live demo (Vercel) | Done | https://night-gate-mauve.vercel.app |
| Demo video | Instructions ready | `docs/evidence/DEMO_VIDEO.md` |
| ≥8 commits | Tracked on `main` | `git rev-list --count HEAD` |
| README privacy claim | Done | `README.md` |
| Vitest ≥3 | Done (6 passing) | `npm test` |

## Level claim

**Level 2 — Waxing Crescent** (builds on completed Level 1). Primary wallet: **1AM**.
