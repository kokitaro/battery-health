# BioCell

BioCell scores the state-of-health of EV battery packs on [GenLayer](https://genlayer.com): licensed oracles post signed telemetry, validators reason over each reading's physical plausibility with an LLM, and a panel reaches consensus on a 0–100 health score that turns an underperforming pack's bond slashable.

## How it works

1. Register a pack: a submitter bonds GEN and registers a pack with a verifiable manifest that the contract fetches and checks from the web.
2. Post telemetry: licensed oracles submit signed BMS blobs — state-of-charge, cycle count, temperature exposure, voltage sag, capacity fade.
3. Score by consensus: validators run an LLM coherence check on each blob and agree on a 0–100 state-of-health score within a tolerance band.
4. Slash if unhealthy: when a pack's score sits below its registered threshold and an independent second-opinion review concurs, its bond becomes slashable.

## Architecture

```
backend/battery-health.py   GenLayer Intelligent Contract (Python, runs on the GenVM)
frontend/                   React + Vite + TypeScript dashboard (genlayer-js)
```

State is event-sourced: the contract keeps an append-only event log and replays pack, oracle, and market projections on read, so writes stay small and the full scoring history stays auditable on-chain.

## Live deployment

- **Network**: GenLayer Bradbury testnet (chain id 4221)
- **Contract**: `0xBb85f2210755f48886F7b8169cE022bF9C1929b3`
- **App**: https://kokitaro.github.io/battery-health/

## Run locally

```bash
cd frontend
npm install
npm run dev
npm run build
```

The committed `.env` holds the public Bradbury config; no secrets are required. Copy `.env.example` to `.env.local` only to override.

## Environment variables

| Name | Required | Description |
|------|----------|-------------|
| `VITE_CONTRACT_ADDRESS` | yes | Deployed BatteryLedger contract on Bradbury |
| `VITE_CHAIN_ID` | yes | GenLayer chain id (4221) |
| `VITE_RPC_URL` | yes | Bradbury JSON-RPC endpoint |

## Deploy the contract

```bash
npx genlayer deploy --contract backend/battery-health.py
```

## Contract methods (`BatteryLedger`)

| Method | Type | Description |
|--------|------|-------------|
| `register_pack` | payable | Bond GEN, fetch and verify the manifest from the web, register a pack with an initial score. |
| `post_telemetry` | write | Submit a signed telemetry blob; validators run an LLM coherence check, then recompute. |
| `recompute_score` | write | Recompute the consensus state-of-health score from recent telemetry. |
| `top_up_bond` | payable | Add GEN to a pack's bond. |
| `withdraw_bond` | write | Withdraw bond, gated by a score margin and a per-seq cooldown (submitter only). |
| `trigger_slash` | write | Slash a pack below threshold after an LLM second opinion concurs, or on a recall hit. |
| `pay_oracle` | write | Pay an oracle's accrued agreeing-post credit, pro-rata. |
| `set_pack_threshold` | write | Update a pack's slash threshold (submitter only). |
| `register_oracle` | write | Register the caller as a telemetry oracle. |
| `score` | view | Current state-of-health score (0–100) for a pack. |
| `pack` | view | Full pack projection: submitter, threshold, score, bond, telemetry counts. |
| `oracle` | view | Oracle reputation: posts, agreeing posts, payouts, pending credit. |
| `event_count` | view | Number of events emitted for a pack. |
| `events` | view | Paged list of a pack's events. |
| `market_summary` | view | Aggregate counts: packs, telemetry, recomputes, slashes, bonded, payouts. |
| `pending_oracle_credit` | view | Claimable credit for an oracle on a given pack. |
| `recent_events` | view | Tail of the global event log, most recent first. |
| `top_oracles` | view | Oracle leaderboard sorted by agreeing posts then posts. |
| `pack_event_kinds_summary` | view | Count of each event kind for a pack. |

## License

MIT
