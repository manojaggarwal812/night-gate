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

After the first successful Lace **Deploy to Preprod**, set:

```bash
vercel env add VITE_CONTRACT_ADDRESS
```

Then redeploy so Join is prefilled.
