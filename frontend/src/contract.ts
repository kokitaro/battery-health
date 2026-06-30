// Typed client wrapper around the deployed BatteryLedger contract.
// All method names match the on-chain (snake_case) Python signatures exactly.
import { createClient, createAccount } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

export type Hex = `0x${string}`;

export const CONTRACT_ADDRESS: Hex =
  (import.meta.env.VITE_CONTRACT_ADDRESS ?? "0xBb85f2210755f48886F7b8169cE022bF9C1929b3") as Hex;
export const RPC_URL: string = import.meta.env.VITE_RPC_URL ?? "https://rpc-bradbury.genlayer.com";
export const CHAIN_ID: number = Number(import.meta.env.VITE_CHAIN_ID ?? 4221);

// genlayer-js chain (carries consensusMainContract for writes).
const GL_CHAIN = testnetBradbury;

const ACCEPTED_TIMEOUT_MS = 240_000;

// ── EventKind mirror (must match backend KIND_NAMES) ──────────────────
export const KIND = {
  PACK_REGISTERED: 1,
  TELEMETRY_POSTED: 2,
  SCORE_RECOMPUTED: 3,
  SLASH_TRIGGERED: 4,
  ORACLE_PAID: 5,
  BOND_TOPPED_UP: 6,
  BOND_WITHDRAWN: 7,
  THRESHOLD_CHANGED: 8,
  ORACLE_REGISTERED: 9,
} as const;

// ── Shapes ────────────────────────────────────────────────────────────
export interface MarketSummary {
  packs_registered: number;
  packs_slashed: number;
  telemetry_events: number;
  score_recompute_events: number;
  slash_events: number;
  total_bonded: number;
  total_payouts: number;
  log_length: number;
}

export interface PackView {
  pack_id: string;
  exists: boolean;
  submitter: string;
  vin_hash: string;
  manifest_uri: string;
  threshold: number;
  score: number;
  last_score_seq: number;
  bonded: number;
  slashed: boolean;
  slashed_at_seq: number;
  telemetry_count: number;
  last_telemetry_seq: number;
  registered_at_seq: number;
  cumulative_payouts: number;
}

export interface EventView {
  seq: number;
  pack_id: string;
  kind: number;
  kind_name: string;
  actor: string;
  value: number;
  payload: string;
}

export interface OracleView {
  addr: string;
  registered: boolean;
  license_hint: string;
  posts: number;
  agreeing_posts: number;
  paid_total: number;
  pending_credit: number;
  last_post_seq: number;
}

export interface TopOracle {
  addr: string;
  agreeing_posts: number;
  posts: number;
  paid_total: number;
}

// Counts of each EventKind name observed for a pack (e.g. SCORE_RECOMPUTED: 3).
export type PackEventKinds = Record<string, number>;

// ── coercion helpers ──────────────────────────────────────────────────
function num(x: unknown): number {
  if (typeof x === "bigint") return Number(x);
  if (typeof x === "number") return x;
  const n = Number(x as number);
  return Number.isFinite(n) ? n : 0;
}
function str(x: unknown): string {
  return x == null ? "" : String(x);
}
function bool(x: unknown): boolean {
  return Boolean(x);
}
function field(o: unknown, key: string, idx: number): unknown {
  if (o == null) return undefined;
  if (Array.isArray(o)) return o[idx];
  if (typeof o === "object" && key in (o as Record<string, unknown>)) {
    return (o as Record<string, unknown>)[key];
  }
  return undefined;
}

// ── clients ───────────────────────────────────────────────────────────
type AnyClient = ReturnType<typeof createClient>;

// Minimal EIP-1193 provider shape (what a wagmi connector exposes).
export interface Eip1193Provider {
  request(args: { method: string; params?: unknown[] }): Promise<unknown>;
}

// Connected-wallet context: the address signs, the provider prompts.
export interface WalletCtx {
  provider: Eip1193Provider;
  address: Hex;
}

function reader(): AnyClient {
  // No injected account -> all calls route to the endpoint RPC (reads only).
  return createClient({ chain: GL_CHAIN, endpoint: RPC_URL, account: createAccount() });
}

// Build a write client backed by the connected wallet. Passing `account` as a
// STRING address (not a local key) makes genlayer-js route eth_sendTransaction
// to `provider` (the injected wallet), so the user approves every tx and no key
// ever lives in the page.
function writer(ctx: WalletCtx): AnyClient {
  return createClient({
    chain: GL_CHAIN,
    endpoint: RPC_URL,
    account: ctx.address,
    provider: ctx.provider as never,
  });
}

async function readRaw(functionName: string, args: unknown[] = []): Promise<unknown> {
  const c = reader();
  return c.readContract({ address: CONTRACT_ADDRESS, functionName, args: args as never });
}

async function waitAccepted(c: AnyClient, hash: string): Promise<void> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Transaction timed out")), ACCEPTED_TIMEOUT_MS);
  });
  try {
    await Promise.race([
      c.waitForTransactionReceipt({
        hash: hash as never,
        status: TransactionStatus.ACCEPTED,
        interval: 5000,
        retries: 64,
      }),
      timeout,
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function send(ctx: WalletCtx, functionName: string, args: unknown[], value: bigint): Promise<string> {
  const c = writer(ctx);
  const hash = (await c.writeContract({
    address: CONTRACT_ADDRESS,
    functionName,
    args: args as never,
    value,
  })) as string;
  await waitAccepted(c, hash);
  return hash;
}

// ── READ helpers ──────────────────────────────────────────────────────
export async function getMarketSummary(): Promise<MarketSummary> {
  const r = await readRaw("market_summary", []);
  return {
    packs_registered: num(field(r, "packs_registered", 0)),
    packs_slashed: num(field(r, "packs_slashed", 1)),
    telemetry_events: num(field(r, "telemetry_events", 2)),
    score_recompute_events: num(field(r, "score_recompute_events", 3)),
    slash_events: num(field(r, "slash_events", 4)),
    total_bonded: num(field(r, "total_bonded", 5)),
    total_payouts: num(field(r, "total_payouts", 6)),
    log_length: num(field(r, "log_length", 7)),
  };
}

export async function getScore(packId: string): Promise<number> {
  return num(await readRaw("score", [packId]));
}

export async function getPack(packId: string): Promise<PackView> {
  const r = await readRaw("pack", [packId]);
  return {
    pack_id: str(field(r, "pack_id", 0)),
    exists: bool(field(r, "exists", 1)),
    submitter: str(field(r, "submitter", 2)),
    vin_hash: str(field(r, "vin_hash", 3)),
    manifest_uri: str(field(r, "manifest_uri", 4)),
    threshold: num(field(r, "threshold", 5)),
    score: num(field(r, "score", 6)),
    last_score_seq: num(field(r, "last_score_seq", 7)),
    bonded: num(field(r, "bonded", 8)),
    slashed: bool(field(r, "slashed", 9)),
    slashed_at_seq: num(field(r, "slashed_at_seq", 10)),
    telemetry_count: num(field(r, "telemetry_count", 11)),
    last_telemetry_seq: num(field(r, "last_telemetry_seq", 12)),
    registered_at_seq: num(field(r, "registered_at_seq", 13)),
    cumulative_payouts: num(field(r, "cumulative_payouts", 14)),
  };
}

function toEvent(r: unknown): EventView {
  return {
    seq: num(field(r, "seq", 0)),
    pack_id: str(field(r, "pack_id", 1)),
    kind: num(field(r, "kind", 2)),
    kind_name: str(field(r, "kind_name", 3)),
    actor: str(field(r, "actor", 4)),
    value: num(field(r, "value", 5)),
    payload: str(field(r, "payload", 6)),
  };
}

export async function getEventCount(packId: string): Promise<number> {
  return num(await readRaw("event_count", [packId]));
}

export async function getEvents(packId: string, offset: number, limit: number): Promise<EventView[]> {
  const r = await readRaw("events", [packId, offset, limit]);
  return Array.isArray(r) ? r.map(toEvent) : [];
}

export async function getRecentEvents(limit: number): Promise<EventView[]> {
  const r = await readRaw("recent_events", [limit]);
  return Array.isArray(r) ? r.map(toEvent) : [];
}

// oracle(addr) -> per-oracle projection (posts, agreeing posts, payouts, credit).
export async function getOracle(addr: string): Promise<OracleView> {
  const r = await readRaw("oracle", [addr]);
  return {
    addr: str(field(r, "addr", 0)),
    registered: bool(field(r, "registered", 1)),
    license_hint: str(field(r, "license_hint", 2)),
    posts: num(field(r, "posts", 3)),
    agreeing_posts: num(field(r, "agreeing_posts", 4)),
    paid_total: num(field(r, "paid_total", 5)),
    pending_credit: num(field(r, "pending_credit", 6)),
    last_post_seq: num(field(r, "last_post_seq", 7)),
  };
}

// pending_oracle_credit(pack_id, oracle_addr) -> claimable credit for that pair.
export async function getPendingOracleCredit(packId: string, oracleAddr: string): Promise<number> {
  return num(await readRaw("pending_oracle_credit", [packId, oracleAddr]));
}

// top_oracles(limit) -> leaderboard sorted by agreeing posts then posts.
export async function getTopOracles(limit: number): Promise<TopOracle[]> {
  const r = await readRaw("top_oracles", [limit]);
  if (!Array.isArray(r)) return [];
  return r.map((o) => ({
    addr: str(field(o, "addr", 0)),
    agreeing_posts: num(field(o, "agreeing_posts", 1)),
    posts: num(field(o, "posts", 2)),
    paid_total: num(field(o, "paid_total", 3)),
  }));
}

// pack_event_kinds_summary(pack_id) -> { KIND_NAME: count }.
export async function getPackEventKinds(packId: string): Promise<PackEventKinds> {
  const r = await readRaw("pack_event_kinds_summary", [packId]);
  const out: PackEventKinds = {};
  if (r && typeof r === "object" && !Array.isArray(r)) {
    for (const [k, v] of Object.entries(r as Record<string, unknown>)) out[k] = num(v);
  }
  return out;
}

// Parse the new_score series from SCORE_RECOMPUTED event payloads (oldest→newest).
export function scoreSeries(events: EventView[]): number[] {
  const out: { seq: number; v: number }[] = [];
  for (const ev of events) {
    if (ev.kind !== KIND.SCORE_RECOMPUTED) continue;
    try {
      const p = JSON.parse(ev.payload) as { new_score?: number };
      if (p && typeof p.new_score !== "undefined") out.push({ seq: ev.seq, v: num(p.new_score) });
    } catch {
      /* ignore malformed payloads */
    }
  }
  out.sort((a, b) => a.seq - b.seq);
  return out.map((o) => o.v);
}

// ── WRITE helpers (each needs a connected wallet context) ─────────────
export function registerPack(
  ctx: WalletCtx,
  packId: string,
  vinHash: string,
  manifestUri: string,
  threshold: number,
  bondWei: bigint,
): Promise<string> {
  return send(ctx, "register_pack", [packId, vinHash, manifestUri, threshold], bondWei);
}

export function postTelemetry(ctx: WalletCtx, packId: string, signedBlob: string, oracleId: string): Promise<string> {
  return send(ctx, "post_telemetry", [packId, signedBlob, oracleId], 0n);
}

export function recomputeScore(ctx: WalletCtx, packId: string): Promise<string> {
  return send(ctx, "recompute_score", [packId], 0n);
}

export function triggerSlash(ctx: WalletCtx, packId: string): Promise<string> {
  return send(ctx, "trigger_slash", [packId], 0n);
}

export function registerOracle(ctx: WalletCtx, licenseHint: string): Promise<string> {
  return send(ctx, "register_oracle", [licenseHint], 0n);
}

export function topUpBond(ctx: WalletCtx, packId: string, value: bigint): Promise<string> {
  return send(ctx, "top_up_bond", [packId], value);
}

// withdraw_bond(pack_id, amount) — submitter-only, non-payable. amount is u256 wei.
export function withdrawBond(ctx: WalletCtx, packId: string, amount: bigint): Promise<string> {
  return send(ctx, "withdraw_bond", [packId, amount], 0n);
}

// pay_oracle(pack_id, oracle_addr) — pays out an oracle's agreeing-post credit.
export function payOracle(ctx: WalletCtx, packId: string, oracleAddr: string): Promise<string> {
  return send(ctx, "pay_oracle", [packId, oracleAddr], 0n);
}

export function setPackThreshold(ctx: WalletCtx, packId: string, newThreshold: number): Promise<string> {
  return send(ctx, "set_pack_threshold", [packId, newThreshold], 0n);
}
