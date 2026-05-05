# 2027 Holder Tool

A free, open-source companion to the [D17 Burn Calculator](https://github.com/dr4c0-git/d17-burn-calculator) for 2027 token holders on Ethereum.

Two views, one source of truth :

- **Lookup** : enter your address to see your 2027 balance, your share of circulating supply, and your projected D17 allocation across the 5 allocation events.
- **Holders** : live ranked table of every 2027 holder, with projected D17 allocation per wallet.

Built around the official mechanics announced by [@xbt2027](https://x.com/xbt2027).

> ⚠️ The @xbt2027 project moves fast. The mechanics implemented here reflect the state as of the latest verified tweets. **Always verify the current rules directly on the [@xbt2027 profile](https://x.com/xbt2027) before acting.**

## Mechanics implemented

- **1:1 proportional allocation** of D17 to 2027 holders, capped at **35% of D17 total supply** collectively (350M D17 of the 1B total).
- **Allocation is computed against circulating supply only** : tokens at the dead address (`0x000…dead`) and other long-locked addresses do not dilute holders.
- The 35% pool is split across the 5 successive allocation events (so ~7% of D17 supply per event flows to 2027 holders collectively).
- This tool reads on-chain balances live and ranks holders by their current 2027 share.

See [`docs/mechanics.md`](./docs/mechanics.md) for the full reference and source tweets.

## Live

- **App** : (to be set after first deploy)
- **API** : (to be set after first deploy)

## API endpoints

| Endpoint | Description |
| -------- | ----------- |
| `GET /state` | Indexing snapshot : circulating supply, total holders, last indexed block. |
| `GET /holders` | Ranked table of all current holders with projected D17 allocation. |
| `GET /holders/{address}` | Single-address lookup (case-insensitive). |
| `POST /simulate` | What-if : projected D17 if you held a given amount of 2027. |

## Stack

- **Frontend** : Vite + React + TypeScript + Tailwind CSS
- **Backend** : FastAPI + Python (httpx, in-memory state)
- **Ethereum indexing** : [Etherscan API V2](https://etherscan.io) (free tier)
- **Hosting** : Cloudflare Pages (frontend), Render (backend)

## Local development

```bash
# Backend
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env  # add your ETHERSCAN_API_KEY
uvicorn main:app --reload

# Frontend (in a second terminal)
cd frontend
npm install
npm run dev
```

## Contributing

Contributions welcome. Open an issue or PR.

## Credits

Built by [@__dr4c0__](https://x.com/__dr4c0__) as part of the D17 contributor effort.
The mechanics, vision, and entire system are designed by [@xbt2027](https://x.com/xbt2027).

## License

MIT
