# Live demo

| Field | Value |
|---|---|
| Host | Vercel |
| URL | https://night-gate-mauve.vercel.app |
| Network | Preprod |
| App path | `web/` (Vite build → `web/dist`) |

## Deploy commands

```bash
npm run web:sync-zk
vercel --prod
```

Join is prefilled with the live Preprod address:

`17d06850fed3c49058994d4fced343144159b622579e63fc11e4132307948eef`

(Override anytime with `VITE_CONTRACT_ADDRESS` on Vercel.)
