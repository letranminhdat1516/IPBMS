# ImageVerify backend

Small Express backend to call the `ImageVerify` contract compiled artifact in `../artifacts/ImageVerify.json`.

Setup
- Copy `.env.example` to `.env` and set RPC_URL and CONTRACT_ADDRESS (and optionally PRIVATE_KEY for sending txs).
- Install deps:

```powershell
cd be; npm install
```

Run

```powershell
cd be; npm start
```

Endpoints
- GET /health -> { ok: true }
- GET /verify/:hash -> returns { exists, timestamp, creator }
  - `:hash` can be a 0x-prefixed bytes32 hex string, a 64-hex string, or a text string (text will be keccak256-hashed)
- POST /register { hash, creator, privateKey? } -> sends registerImage(tx)
  - `privateKey` may be passed in body or set in `.env` as PRIVATE_KEY (dev only).

Notes
- This is a minimal example. Do NOT put real private keys in .env in production.
