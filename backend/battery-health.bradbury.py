# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
import hashlib
import json
from dataclasses import dataclass
from enum import IntEnum
from genlayer import *
SCORE_MIN = 0
SCORE_MAX = 100
SCORE_DEFAULT_INITIAL = 50
WITHDRAW_SAFETY_MARGIN = 10
RECOMPUTE_MIN_TELEMETRY = 1
SCORE_BAND_TOLERANCE = 5
SLASH_SHARE_BPS_CALLER = 5000
SLASH_SHARE_BPS_ORACLES = 5000
TELEMETRY_BLOB_MIN_BYTES = 64
TELEMETRY_BLOB_MAX_BYTES = 32768
ORACLE_AGREEMENT_WINDOW_EVENTS = 16
ORACLE_AGREEMENT_BAND = 8
ORACLE_PAYOUT_MIN_POSTS = 3
WITHDRAW_COOLDOWN_SEQS = 5
MANIFEST_REQUIRED_KEYS = ('manufacturer', 'model', 'chemistry', 'rated_capacity_kwh', 'year')
ERR_PACK_REF_EMPTY = 1
ERR_PACK_ALREADY_REGISTERED = 2
ERR_PACK_UNKNOWN = 3
ERR_THRESHOLD_OUT_OF_RANGE = 4
ERR_MANIFEST_URI_EMPTY = 5
ERR_VIN_HASH_INVALID = 6
ERR_NOT_SUBMITTER = 7
ERR_TELEMETRY_TOO_SHORT = 8
ERR_TELEMETRY_TOO_LARGE = 9
ERR_ORACLE_UNKNOWN = 10
ERR_ORACLE_ALREADY_REGISTERED = 11
ERR_BOND_ZERO = 12
ERR_BOND_TOO_SMALL_FOR_WITHDRAW = 13
ERR_WITHDRAW_BLOCKED_BY_COOLDOWN = 14
ERR_INVALID_OFFSET_OR_LIMIT = 15
ERR_BAD_EVENT_KIND = 16
ERR_BAD_PAYLOAD_JSON = 17
ERR_PACK_ALREADY_SLASHED = 18
ERR_THRESHOLD_NOT_OWNER = 19
ERR_PAYABLE_REQUIRED = 20
ERR_NOT_PAYABLE = 21
ERR_SELF_PAYOUT_FORBIDDEN = 22
ERR_LLM_REFUSED = 50
ERR_LLM_MALFORMED_JSON = 51
ERR_LLM_BAD_FIELD = 52
ERR_LLM_VALIDATOR_DISAGREE = 53
ERR_LLM_OUT_OF_RANGE = 54
ERR_LLM_NO_RATIONALE = 55
ERR_WEB_4XX = 80
ERR_WEB_5XX = 81
ERR_WEB_BODY_NOT_JSON = 82
ERR_WEB_MISSING_KEYS = 83
ERR_WEB_TIMEOUT = 84
ERR_WEB_NO_FETCH_AVAILABLE = 85
ERR_SLASH_SCORE_ABOVE_THRESHOLD = 100
ERR_SLASH_INSUFFICIENT_BOND = 101
ERR_SLASH_SECOND_OPINION_REJECT = 102
ERR_SLASH_NO_AGREEING_ORACLES = 103
ERR_SLASH_CALLER_IS_SUBMITTER = 104
ERR_PAYOUT_NO_CREDIT = 120
ERR_PAYOUT_INSUFFICIENT_POOL = 121
ERR_PAYOUT_BELOW_MIN_POSTS = 122
ERR_PAYOUT_ORACLE_NOT_REGISTERED = 123

def _raise(code: int, **detail) -> None:
    try:
        body = json.dumps(detail, sort_keys=True, ensure_ascii=False, default=str)
    except Exception:
        body = json.dumps({'_unprintable_detail': True}, sort_keys=True)
    raise gl.vm.UserError(f'E{code:04d} {body}')

def _safe_int(x, default: int=0) -> int:
    try:
        return int(float(str(x).strip()))
    except Exception:
        return default

def _clamp(n: int, lo: int, hi: int) -> int:
    if n < lo:
        return lo
    if n > hi:
        return hi
    return n

def _safe_str(x, max_len: int=1024) -> str:
    try:
        s = str(x)
    except Exception:
        return ''
    if len(s) > max_len:
        return s[:max_len]
    return s

def _hex(b: bytes) -> str:
    try:
        return '0x' + b.hex()
    except Exception:
        try:
            return '0x' + bytes(b).hex()
        except Exception:
            return '0x'

def _to_bytes(x) -> bytes:
    if isinstance(x, (bytes, bytearray)):
        return bytes(x)
    ab = getattr(x, 'as_bytes', None)
    if ab is not None:
        if callable(ab):
            try:
                ab = ab()
            except Exception:
                ab = None
        if ab is not None:
            try:
                return bytes(ab)
            except Exception:
                return b''
    if isinstance(x, str):
        if x.startswith('0x') and len(x) % 2 == 0:
            try:
                return bytes.fromhex(x[2:])
            except Exception:
                pass
        return x.encode('utf-8')
    try:
        return bytes(x)
    except Exception:
        return b''

class EventKind(IntEnum):
    PACK_REGISTERED = 1
    TELEMETRY_POSTED = 2
    SCORE_RECOMPUTED = 3
    SLASH_TRIGGERED = 4
    ORACLE_PAID = 5
    BOND_TOPPED_UP = 6
    BOND_WITHDRAWN = 7
    THRESHOLD_CHANGED = 8
    ORACLE_REGISTERED = 9
KIND_NAMES = {int(EventKind.PACK_REGISTERED): 'PACK_REGISTERED', int(EventKind.TELEMETRY_POSTED): 'TELEMETRY_POSTED', int(EventKind.SCORE_RECOMPUTED): 'SCORE_RECOMPUTED', int(EventKind.SLASH_TRIGGERED): 'SLASH_TRIGGERED', int(EventKind.ORACLE_PAID): 'ORACLE_PAID', int(EventKind.BOND_TOPPED_UP): 'BOND_TOPPED_UP', int(EventKind.BOND_WITHDRAWN): 'BOND_WITHDRAWN', int(EventKind.THRESHOLD_CHANGED): 'THRESHOLD_CHANGED', int(EventKind.ORACLE_REGISTERED): 'ORACLE_REGISTERED'}

def _kind_label(k: int) -> str:
    return KIND_NAMES.get(int(k), f'UNKNOWN({int(k)})')

def _valid_kind(k: int) -> bool:
    return int(k) in KIND_NAMES

@allow_storage
@dataclass
class BatteryEvent:
    seq: u64
    pack_id: str
    kind: u8
    actor: Address
    value: u256
    payload: str

@dataclass
class PackProjection:
    pack_id: str
    exists: bool
    submitter: Address
    vin_hash: str
    manifest_uri: str
    threshold: int
    score: int
    last_score_seq: int
    bonded: int
    slashed: bool
    slashed_at_seq: int
    telemetry_count: int
    last_telemetry_seq: int
    registered_at_seq: int
    cumulative_payouts: int

@dataclass
class OracleProjection:
    addr: Address
    registered: bool
    license_hint: str
    posts: int
    agreeing_posts: int
    paid_total: int
    pending_credit: int
    last_post_seq: int

@dataclass
class MarketProjection:
    packs_registered: int
    packs_slashed: int
    telemetry_events: int
    score_recompute_events: int
    slash_events: int
    total_bonded: int
    total_payouts: int
    log_length: int

def _agree_within_band(a: int, b: int, band: int=SCORE_BAND_TOLERANCE) -> bool:
    try:
        ai = int(a)
        bi = int(b)
    except Exception:
        return False
    return abs(ai - bi) <= int(band)

def _agree_on_categorical(a: str, b: str) -> bool:
    if a is None and b is None:
        return True
    if a is None or b is None:
        return False
    return str(a).strip().lower() == str(b).strip().lower()

def _agree_on_recall_status(a: dict, b: dict) -> bool:
    if not isinstance(a, dict) or not isinstance(b, dict):
        return False
    return bool(a.get('is_recalled')) == bool(b.get('is_recalled'))

def _payload_register_pack(*, submitter: Address, vin_hash: str, manifest_uri: str, threshold: int, initial_score: int, manifest_verified: bool, manifest_summary: dict) -> str:
    obj = {'submitter': _hex(_to_bytes(submitter)), 'vin_hash': vin_hash, 'manifest_uri': _safe_str(manifest_uri, 1024), 'threshold': int(threshold), 'initial_score': int(initial_score), 'manifest_verified': bool(manifest_verified), 'manifest_summary': manifest_summary if isinstance(manifest_summary, dict) else {}}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_post_telemetry(*, oracle: Address, oracle_id: str, blob_sha256_hex: str, blob_size_bytes: int, llm_coherence: dict) -> str:
    obj = {'oracle': _hex(_to_bytes(oracle)), 'oracle_id': oracle_id, 'blob_sha256': blob_sha256_hex, 'blob_size_bytes': int(blob_size_bytes), 'coherence': {'plausible': bool(llm_coherence.get('plausible', False)), 'soh_estimate': int(llm_coherence.get('soh_estimate', 0)), 'confidence': int(llm_coherence.get('confidence', 0)), 'rationale': _safe_str(llm_coherence.get('rationale', ''), 480)}}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_score_recomputed(*, previous_score: int, new_score: int, consensus_basis: int, contributing_telemetry_count: int, rationale: str) -> str:
    obj = {'previous_score': int(previous_score), 'new_score': int(new_score), 'delta': int(new_score) - int(previous_score), 'consensus_basis_count': int(consensus_basis), 'contributing_telemetry_count': int(contributing_telemetry_count), 'rationale': _safe_str(rationale, 480)}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_slash_triggered(*, caller: Address, score_at_slash: int, threshold_at_slash: int, bonded_at_slash: int, slashed_amount: int, caller_share: int, oracle_pool_share: int, second_opinion: dict, recall_status: dict) -> str:
    obj = {'caller': _hex(_to_bytes(caller)), 'score_at_slash': int(score_at_slash), 'threshold_at_slash': int(threshold_at_slash), 'bonded_at_slash': int(bonded_at_slash), 'slashed_amount': int(slashed_amount), 'caller_share': int(caller_share), 'oracle_pool_share': int(oracle_pool_share), 'second_opinion': {'concurs': bool(second_opinion.get('concurs', False)), 'second_score': int(second_opinion.get('second_score', 0)), 'rationale': _safe_str(second_opinion.get('rationale', ''), 320)}, 'recall': {'is_recalled': bool(recall_status.get('is_recalled', False)), 'source': _safe_str(recall_status.get('source', ''), 256)}}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_oracle_paid(*, oracle: Address, pack_id: str, paid_amount: int, agreeing_posts: int) -> str:
    obj = {'oracle': _hex(_to_bytes(oracle)), 'pack_id': pack_id, 'paid_amount': int(paid_amount), 'agreeing_posts': int(agreeing_posts)}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_bond_top_up(*, by: Address, amount: int, new_bonded_total: int) -> str:
    obj = {'by': _hex(_to_bytes(by)), 'amount': int(amount), 'new_bonded_total': int(new_bonded_total)}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_bond_withdrawn(*, by: Address, amount: int, new_bonded_total: int) -> str:
    obj = {'by': _hex(_to_bytes(by)), 'amount': int(amount), 'new_bonded_total': int(new_bonded_total)}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_threshold_changed(*, by: Address, previous: int, new: int) -> str:
    obj = {'by': _hex(_to_bytes(by)), 'previous_threshold': int(previous), 'new_threshold': int(new)}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _payload_oracle_registered(*, addr: Address, license_hint: str) -> str:
    obj = {'addr': _hex(_to_bytes(addr)), 'license_hint': _safe_str(license_hint, 512)}
    return json.dumps(obj, sort_keys=True, ensure_ascii=False)

def _parse_payload(s: str) -> dict:
    if not s:
        return {}
    try:
        v = json.loads(s)
        return v if isinstance(v, dict) else {}
    except Exception:
        return {}

class BatteryLedger(gl.Contract):
    event_log: DynArray[BatteryEvent]
    next_seq: u64
    pack_first_seq: TreeMap[str, u64]
    pack_last_seq: TreeMap[str, u64]

    def __init__(self):
        self.next_seq = u64(1)

    def _emit(self, pack_id: str, kind: EventKind, payload: str, value: int=0) -> u64:
        if not _valid_kind(int(kind)):
            _raise(ERR_BAD_EVENT_KIND, kind=int(kind))
        seq = self.next_seq
        ev = BatteryEvent(seq=seq, pack_id=pack_id, kind=u8(int(kind)), actor=gl.message.sender_address, value=u256(int(value)), payload=payload)
        self.event_log.append(ev)
        if pack_id not in self.pack_first_seq:
            self.pack_first_seq[pack_id] = seq
        self.pack_last_seq[pack_id] = seq
        self.next_seq = u64(int(seq) + 1)
        return seq

    def _iter_events_for_pack(self, pack_id: str):
        n = len(self.event_log)
        i = 0
        while i < n:
            ev = self.event_log[i]
            if ev.pack_id == pack_id:
                yield ev
            i += 1

    def _iter_events_for_oracle(self, oracle: Address):
        n = len(self.event_log)
        i = 0
        while i < n:
            ev = self.event_log[i]
            if ev.actor == oracle:
                yield ev
            i += 1

    def _iter_all_events(self):
        n = len(self.event_log)
        i = 0
        while i < n:
            yield self.event_log[i]
            i += 1

    def _replay_pack(self, pack_id: str) -> PackProjection:
        proj = PackProjection(pack_id=pack_id, exists=False, submitter=Address(b'\x00' * 20), vin_hash='', manifest_uri='', threshold=0, score=SCORE_DEFAULT_INITIAL, last_score_seq=0, bonded=0, slashed=False, slashed_at_seq=0, telemetry_count=0, last_telemetry_seq=0, registered_at_seq=0, cumulative_payouts=0)
        for ev in self._iter_events_for_pack(pack_id):
            k = int(ev.kind)
            p = _parse_payload(ev.payload)
            if k == int(EventKind.PACK_REGISTERED):
                proj.exists = True
                proj.submitter = ev.actor
                vh = p.get('vin_hash', '')
                if isinstance(vh, str):
                    proj.vin_hash = vh
                proj.manifest_uri = _safe_str(p.get('manifest_uri', ''), 1024)
                proj.threshold = _safe_int(p.get('threshold', 0))
                proj.score = _safe_int(p.get('initial_score', SCORE_DEFAULT_INITIAL))
                proj.bonded = int(ev.value)
                proj.registered_at_seq = int(ev.seq)
            elif k == int(EventKind.TELEMETRY_POSTED):
                proj.telemetry_count += 1
                proj.last_telemetry_seq = int(ev.seq)
            elif k == int(EventKind.SCORE_RECOMPUTED):
                ns = _safe_int(p.get('new_score', proj.score))
                proj.score = _clamp(ns, SCORE_MIN, SCORE_MAX)
                proj.last_score_seq = int(ev.seq)
            elif k == int(EventKind.SLASH_TRIGGERED):
                proj.slashed = True
                proj.slashed_at_seq = int(ev.seq)
                slashed_amount = _safe_int(p.get('slashed_amount', 0))
                proj.bonded = max(0, proj.bonded - slashed_amount)
            elif k == int(EventKind.ORACLE_PAID):
                paid = _safe_int(p.get('paid_amount', 0))
                proj.cumulative_payouts += paid
            elif k == int(EventKind.BOND_TOPPED_UP):
                amt = _safe_int(p.get('amount', 0))
                proj.bonded += amt
            elif k == int(EventKind.BOND_WITHDRAWN):
                amt = _safe_int(p.get('amount', 0))
                proj.bonded = max(0, proj.bonded - amt)
            elif k == int(EventKind.THRESHOLD_CHANGED):
                new_t = _safe_int(p.get('new_threshold', proj.threshold))
                proj.threshold = _clamp(new_t, SCORE_MIN, SCORE_MAX)
        return proj

    def _replay_oracle(self, oracle: Address) -> OracleProjection:
        proj = OracleProjection(addr=oracle, registered=False, license_hint='', posts=0, agreeing_posts=0, paid_total=0, pending_credit=0, last_post_seq=0)
        for ev in self._iter_all_events():
            k = int(ev.kind)
            p = _parse_payload(ev.payload)
            if k == int(EventKind.ORACLE_REGISTERED):
                if ev.actor == oracle:
                    proj.registered = True
                    proj.license_hint = _safe_str(p.get('license_hint', ''), 512)
            elif k == int(EventKind.TELEMETRY_POSTED):
                if ev.actor == oracle:
                    proj.posts += 1
                    proj.last_post_seq = int(ev.seq)
            elif k == int(EventKind.ORACLE_PAID):
                paid_to = p.get('oracle', '')
                oracle_hex = _hex(_to_bytes(oracle))
                if isinstance(paid_to, str) and paid_to.lower() == oracle_hex.lower():
                    proj.paid_total += _safe_int(p.get('paid_amount', 0))
        proj.agreeing_posts = self._count_agreeing_posts(oracle)
        proj.pending_credit = max(0, proj.agreeing_posts - 0)
        return proj

    def _count_agreeing_posts(self, oracle: Address) -> int:
        n = len(self.event_log)
        agreeing = 0
        i = 0
        while i < n:
            ev = self.event_log[i]
            if int(ev.kind) == int(EventKind.TELEMETRY_POSTED) and ev.actor == oracle:
                p = _parse_payload(ev.payload)
                coh = p.get('coherence', {}) if isinstance(p, dict) else {}
                oracle_estimate = _safe_int(coh.get('soh_estimate', 0))
                pack_id = ev.pack_id
                j = i + 1
                examined = 0
                while j < n and examined < ORACLE_AGREEMENT_WINDOW_EVENTS:
                    fwd = self.event_log[j]
                    if fwd.pack_id == pack_id:
                        examined += 1
                        if int(fwd.kind) == int(EventKind.SCORE_RECOMPUTED):
                            fp = _parse_payload(fwd.payload)
                            consensus = _safe_int(fp.get('new_score', -1))
                            if consensus >= 0 and abs(consensus - oracle_estimate) <= ORACLE_AGREEMENT_BAND:
                                agreeing += 1
                            break
                    j += 1
            i += 1
        return agreeing

    def _replay_market(self) -> MarketProjection:
        m = MarketProjection(packs_registered=0, packs_slashed=0, telemetry_events=0, score_recompute_events=0, slash_events=0, total_bonded=0, total_payouts=0, log_length=len(self.event_log))
        for ev in self._iter_all_events():
            k = int(ev.kind)
            if k == int(EventKind.PACK_REGISTERED):
                m.packs_registered += 1
                m.total_bonded += int(ev.value)
            elif k == int(EventKind.TELEMETRY_POSTED):
                m.telemetry_events += 1
            elif k == int(EventKind.SCORE_RECOMPUTED):
                m.score_recompute_events += 1
            elif k == int(EventKind.SLASH_TRIGGERED):
                m.slash_events += 1
                m.packs_slashed += 1
                p = _parse_payload(ev.payload)
                m.total_bonded -= _safe_int(p.get('slashed_amount', 0))
            elif k == int(EventKind.BOND_TOPPED_UP):
                p = _parse_payload(ev.payload)
                m.total_bonded += _safe_int(p.get('amount', 0))
            elif k == int(EventKind.BOND_WITHDRAWN):
                p = _parse_payload(ev.payload)
                m.total_bonded -= _safe_int(p.get('amount', 0))
            elif k == int(EventKind.ORACLE_PAID):
                p = _parse_payload(ev.payload)
                m.total_payouts += _safe_int(p.get('paid_amount', 0))
        if m.total_bonded < 0:
            m.total_bonded = 0
        return m

    def _assert_pack_exists(self, pack_id: str) -> PackProjection:
        proj = self._replay_pack(pack_id)
        if not proj.exists:
            _raise(ERR_PACK_UNKNOWN, pack_id=pack_id)
        return proj

    def _assert_pack_not_slashed(self, proj: PackProjection) -> None:
        if proj.slashed:
            _raise(ERR_PACK_ALREADY_SLASHED, pack_id=proj.pack_id)

    def _assert_caller_is_submitter(self, proj: PackProjection) -> None:
        if proj.submitter != gl.message.sender_address:
            _raise(ERR_NOT_SUBMITTER, expected=_hex(_to_bytes(proj.submitter)), caller=_hex(_to_bytes(gl.message.sender_address)))

    def _assert_payable_received(self, min_value: int=1) -> int:
        try:
            v = int(gl.message.value)
        except Exception:
            v = 0
        if v < min_value:
            _raise(ERR_PAYABLE_REQUIRED, got=v, required=int(min_value))
        return v

    def _assert_not_payable(self) -> None:
        try:
            v = int(gl.message.value)
        except Exception:
            v = 0
        if v > 0:
            _raise(ERR_NOT_PAYABLE, value=v)

    def _assert_threshold_in_range(self, threshold: int) -> int:
        if threshold < SCORE_MIN or threshold > SCORE_MAX:
            _raise(ERR_THRESHOLD_OUT_OF_RANGE, given=int(threshold), lo=SCORE_MIN, hi=SCORE_MAX)
        return int(threshold)

    def _assert_telemetry_size(self, blob: str) -> int:
        try:
            n = len(blob.encode('utf-8'))
        except Exception:
            n = len(blob)
        if n < TELEMETRY_BLOB_MIN_BYTES:
            _raise(ERR_TELEMETRY_TOO_SHORT, size=n, min=TELEMETRY_BLOB_MIN_BYTES)
        if n > TELEMETRY_BLOB_MAX_BYTES:
            _raise(ERR_TELEMETRY_TOO_LARGE, size=n, max=TELEMETRY_BLOB_MAX_BYTES)
        return n

    def _llm_coherence_check(self, *, pack_ref_hex: str, manifest_uri: str, manifest_summary: dict, blob: str) -> dict:
        manifest_brief = json.dumps(manifest_summary, sort_keys=True)[:512]
        blob_snippet = blob[:4096]

        def call():
            prompt = f'You are a battery-pack telemetry coherence checker. Decide whether the supplied BMS / telemetry blob is INTERNALLY CONSISTENT for a real pack matching the manifest. You are not grading the pack — you are checking whether the blob is physically plausible (cycle count vs capacity fade, internal resistance vs age, cell-voltage spread vs calendar age, temperature exposure vs IR drift).\n\nPack reference: {pack_ref_hex}\nManifest URI: {manifest_uri}\nManifest summary: {manifest_brief}\n---BMS---\n{blob_snippet}\n---BMS---\n\nReturn strict JSON: {{"plausible": <bool>, "soh_estimate": <int 0-100>, "confidence": <int 0-100>, "rationale": "<=420 chars cited from data"}}'
            return gl.nondet.exec_prompt(prompt, response_format='json')

        def validator(leaders_res):
            if not isinstance(leaders_res, gl.vm.Return):
                return self._agree_on_error(leaders_res, call)
            d = leaders_res.calldata
            if not isinstance(d, dict):
                return False
            try:
                leader_soh = int(d.get('soh_estimate'))
            except Exception:
                return False
            if leader_soh < SCORE_MIN or leader_soh > SCORE_MAX:
                return False
            mine = call()
            my_soh = _safe_int(mine.get('soh_estimate', 0))
            return _agree_within_band(my_soh, leader_soh, SCORE_BAND_TOLERANCE)
        raw = gl.vm.run_nondet_unsafe(call, validator)
        return self._normalize_coherence(raw)

    def _llm_consensus_score(self, *, pack_ref_hex: str, manifest_summary: dict, recent_payloads: list) -> dict:
        manifest_brief = json.dumps(manifest_summary, sort_keys=True)[:512]
        coherences = []
        for p in recent_payloads:
            c = p.get('coherence', {}) if isinstance(p, dict) else {}
            coherences.append({'plausible': bool(c.get('plausible', False)), 'soh_estimate': _safe_int(c.get('soh_estimate', 0)), 'confidence': _safe_int(c.get('confidence', 0))})
        coherences_text = json.dumps(coherences, sort_keys=True)[:1800]

        def call():
            prompt = f'You synthesize a consensus pack State-of-Health score from a sequence of independent telemetry coherence reports. Weight more confident reports more heavily. Discount reports that flagged themselves as implausible. Output an integer 0-100.\n\nPack reference: {pack_ref_hex}\nManifest: {manifest_brief}\nCoherence sequence ({len(coherences)} items):\n{coherences_text}\n\nReturn strict JSON: {{"score": <int 0-100>, "rationale": "<=320 chars", "basis_count": {len(coherences)}}}'
            return gl.nondet.exec_prompt(prompt, response_format='json')

        def validator(leaders_res):
            if not isinstance(leaders_res, gl.vm.Return):
                return self._agree_on_error(leaders_res, call)
            d = leaders_res.calldata
            if not isinstance(d, dict):
                return False
            try:
                leader_score = int(d.get('score'))
            except Exception:
                return False
            if leader_score < SCORE_MIN or leader_score > SCORE_MAX:
                return False
            mine = call()
            my_score = _safe_int(mine.get('score', -1))
            return _agree_within_band(my_score, leader_score, SCORE_BAND_TOLERANCE)
        raw = gl.vm.run_nondet_unsafe(call, validator)
        score = _clamp(_safe_int(raw.get('score', SCORE_DEFAULT_INITIAL)), SCORE_MIN, SCORE_MAX)
        return {'score': score, 'rationale': _safe_str(raw.get('rationale', ''), 320), 'basis_count': _safe_int(raw.get('basis_count', len(coherences)))}

    def _llm_slash_second_opinion(self, *, pack_ref_hex: str, proj: PackProjection, recent_payloads: list) -> dict:
        ev_brief = []
        for p in recent_payloads[-8:]:
            c = p.get('coherence', {}) if isinstance(p, dict) else {}
            ev_brief.append({'soh_estimate': _safe_int(c.get('soh_estimate', 0)), 'confidence': _safe_int(c.get('confidence', 0)), 'plausible': bool(c.get('plausible', False))})
        brief_text = json.dumps(ev_brief, sort_keys=True)[:1800]

        def call():
            prompt = f'You are an independent reviewer asked to confirm whether a pack should be slashed. Slash is allowed when the recorded score falls strictly below the registered threshold AND the recent telemetry trend supports this — not a single bad reading. Concur only if the trajectory genuinely warrants slashing.\n\nPack reference: {pack_ref_hex}\nThreshold: {proj.threshold}\nCurrent recorded score: {proj.score}\nTelemetry count: {proj.telemetry_count}\nRecent coherence: {brief_text}\n\nReturn strict JSON: {{"concurs": <bool>, "second_score": <int 0-100>, "rationale": "<=240 chars"}}'
            return gl.nondet.exec_prompt(prompt, response_format='json')

        def validator(leaders_res):
            if not isinstance(leaders_res, gl.vm.Return):
                return self._agree_on_error(leaders_res, call)
            d = leaders_res.calldata
            if not isinstance(d, dict):
                return False
            try:
                leader_score = int(d.get('second_score'))
                leader_concurs = bool(d.get('concurs'))
            except Exception:
                return False
            if leader_score < SCORE_MIN or leader_score > SCORE_MAX:
                return False
            mine = call()
            my_score = _safe_int(mine.get('second_score', -1))
            my_concurs = bool(mine.get('concurs', False))
            return _agree_within_band(my_score, leader_score, SCORE_BAND_TOLERANCE) and my_concurs == leader_concurs
        raw = gl.vm.run_nondet_unsafe(call, validator)
        return {'concurs': bool(raw.get('concurs', False)), 'second_score': _clamp(_safe_int(raw.get('second_score', 0)), SCORE_MIN, SCORE_MAX), 'rationale': _safe_str(raw.get('rationale', ''), 320)}

    def _normalize_coherence(self, raw) -> dict:
        if not isinstance(raw, dict):
            _raise(ERR_LLM_MALFORMED_JSON, got=str(type(raw).__name__))
        soh = _safe_int(raw.get('soh_estimate', -1))
        if soh < SCORE_MIN or soh > SCORE_MAX:
            _raise(ERR_LLM_OUT_OF_RANGE, field='soh_estimate', value=soh)
        conf = _clamp(_safe_int(raw.get('confidence', 0)), 0, 100)
        plaus = bool(raw.get('plausible', False))
        rat = _safe_str(raw.get('rationale', ''), 420)
        if not rat:
            rat = '(no rationale provided)'
        return {'plausible': plaus, 'soh_estimate': soh, 'confidence': conf, 'rationale': rat}

    def _agree_on_error(self, leaders_res, call_fn) -> bool:
        leader_msg = getattr(leaders_res, 'message', '') or str(leaders_res)
        try:
            call_fn()
            return False
        except gl.vm.UserError as e:
            local_msg = getattr(e, 'message', '') or str(e)
            return local_msg[:5] == leader_msg[:5]

    def _fetch_manifest(self, manifest_uri: str) -> dict:
        if not manifest_uri:
            _raise(ERR_MANIFEST_URI_EMPTY)

        def call():
            try:
                response = gl.nondet.web.get(manifest_uri, headers={'Accept': 'application/json'})
            except Exception as e:
                _raise(ERR_WEB_5XX, uri=manifest_uri, detail=str(e)[:240])
            status = getattr(response, 'status', 0)
            if status >= 500:
                _raise(ERR_WEB_5XX, uri=manifest_uri, status=int(status))
            if status >= 400:
                _raise(ERR_WEB_4XX, uri=manifest_uri, status=int(status))
            try:
                body_bytes = getattr(response, 'body', b'')
                if isinstance(body_bytes, (bytes, bytearray)):
                    body_text = body_bytes.decode('utf-8')
                else:
                    body_text = str(body_bytes)
                doc = json.loads(body_text)
            except Exception:
                _raise(ERR_WEB_BODY_NOT_JSON, uri=manifest_uri)
            if not isinstance(doc, dict):
                _raise(ERR_WEB_BODY_NOT_JSON, uri=manifest_uri, kind=str(type(doc).__name__))
            missing = [k for k in MANIFEST_REQUIRED_KEYS if k not in doc]
            if missing:
                _raise(ERR_WEB_MISSING_KEYS, uri=manifest_uri, missing=missing)
            return {'manufacturer': _safe_str(doc.get('manufacturer', ''), 96), 'model': _safe_str(doc.get('model', ''), 96), 'chemistry': _safe_str(doc.get('chemistry', ''), 32), 'rated_capacity_kwh': _safe_int(doc.get('rated_capacity_kwh', 0)), 'year': _safe_int(doc.get('year', 0))}

        def validator(leaders_res):
            if not isinstance(leaders_res, gl.vm.Return):
                return self._agree_on_error(leaders_res, call)
            d = leaders_res.calldata
            if not isinstance(d, dict):
                return False
            mine = call()
            for k in ('manufacturer', 'model', 'chemistry'):
                if str(d.get(k, '')).strip() != str(mine.get(k, '')).strip():
                    return False
            if int(d.get('year', 0)) != int(mine.get('year', 0)):
                return False
            return True
        return gl.vm.run_nondet_unsafe(call, validator)

    def _fetch_recall_status(self, vin_hash: str) -> dict:
        vin_hex = vin_hash if vin_hash else '0x' + '0' * 64
        recall_url = f'https://jsonblob.com/api/jsonBlob/recall-{vin_hex}'

        def call():
            try:
                response = gl.nondet.web.get(recall_url, headers={'Accept': 'application/json'})
            except Exception as e:
                _raise(ERR_WEB_5XX, uri=recall_url, detail=str(e)[:240])
            status = getattr(response, 'status', 0)
            if status == 404:
                return {'is_recalled': False, 'source': recall_url}
            if status >= 500:
                _raise(ERR_WEB_5XX, uri=recall_url, status=int(status))
            if status >= 400:
                _raise(ERR_WEB_4XX, uri=recall_url, status=int(status))
            try:
                body_bytes = getattr(response, 'body', b'')
                if isinstance(body_bytes, (bytes, bytearray)):
                    body_text = body_bytes.decode('utf-8')
                else:
                    body_text = str(body_bytes)
                doc = json.loads(body_text)
            except Exception:
                return {'is_recalled': False, 'source': recall_url}
            if not isinstance(doc, dict):
                return {'is_recalled': False, 'source': recall_url}
            return {'is_recalled': bool(doc.get('recalled', False)), 'source': recall_url}

        def validator(leaders_res):
            if not isinstance(leaders_res, gl.vm.Return):
                return self._agree_on_error(leaders_res, call)
            d = leaders_res.calldata
            if not isinstance(d, dict):
                return False
            mine = call()
            return _agree_on_recall_status(d, mine)
        return gl.vm.run_nondet_unsafe(call, validator)

    def _recent_telemetry_payloads(self, pack_id: str, n: int=5) -> list:
        out = []
        for ev in self._iter_events_for_pack(pack_id):
            if int(ev.kind) == int(EventKind.TELEMETRY_POSTED):
                out.append(_parse_payload(ev.payload))
        return out[-int(n):] if n > 0 else out

    def _pack_ref_hex(self, pack_id: str) -> str:
        return pack_id

    def _split_slash(self, total: int) -> tuple[int, int]:
        caller_share = total * SLASH_SHARE_BPS_CALLER // 10000
        oracle_share = total - caller_share
        return (caller_share, oracle_share)

    @gl.public.write.payable
    def register_pack(self, pack_id: str, vin_hash: str, manifest_uri: str, threshold: u8) -> u64:
        bond = self._assert_payable_received(min_value=1)
        if not _safe_str(manifest_uri, 1024):
            _raise(ERR_MANIFEST_URI_EMPTY)
        threshold_int = self._assert_threshold_in_range(int(threshold))
        if pack_id in self.pack_first_seq:
            existing = self._replay_pack(pack_id)
            if existing.exists:
                _raise(ERR_PACK_ALREADY_REGISTERED, pack_id=self._pack_ref_hex(pack_id))
        manifest_summary = self._fetch_manifest(manifest_uri)
        payload = _payload_register_pack(submitter=gl.message.sender_address, vin_hash=vin_hash, manifest_uri=manifest_uri, threshold=threshold_int, initial_score=SCORE_DEFAULT_INITIAL, manifest_verified=True, manifest_summary=manifest_summary)
        return self._emit(pack_id, EventKind.PACK_REGISTERED, payload, value=bond)

    @gl.public.write
    def post_telemetry(self, pack_id: str, signed_blob: str, oracle_id: str) -> u64:
        self._assert_not_payable()
        proj = self._assert_pack_exists(pack_id)
        self._assert_pack_not_slashed(proj)
        size = self._assert_telemetry_size(signed_blob)
        coherence = self._llm_coherence_check(pack_ref_hex=self._pack_ref_hex(pack_id), manifest_uri=proj.manifest_uri, manifest_summary={'chemistry': '', 'rated_capacity_kwh': 0}, blob=signed_blob)
        try:
            blob_hash = hashlib.sha256(signed_blob.encode('utf-8')).hexdigest()
        except Exception:
            blob_hash = hashlib.sha256(signed_blob.encode('utf-8', errors='ignore')).hexdigest()
        payload = _payload_post_telemetry(oracle=gl.message.sender_address, oracle_id=oracle_id, blob_sha256_hex=blob_hash, blob_size_bytes=size, llm_coherence=coherence)
        seq = self._emit(pack_id, EventKind.TELEMETRY_POSTED, payload)
        self._do_recompute(pack_id)
        return seq

    @gl.public.write
    def recompute_score(self, pack_id: str) -> int:
        self._assert_not_payable()
        proj = self._assert_pack_exists(pack_id)
        self._assert_pack_not_slashed(proj)
        return self._do_recompute(pack_id)

    def _do_recompute(self, pack_id: str) -> int:
        proj = self._replay_pack(pack_id)
        if proj.telemetry_count < RECOMPUTE_MIN_TELEMETRY:
            payload = _payload_score_recomputed(previous_score=proj.score, new_score=SCORE_DEFAULT_INITIAL, consensus_basis=0, contributing_telemetry_count=0, rationale='No telemetry yet; emitting default initial score.')
            self._emit(pack_id, EventKind.SCORE_RECOMPUTED, payload)
            return SCORE_DEFAULT_INITIAL
        recent = self._recent_telemetry_payloads(pack_id, n=8)
        consensus = self._llm_consensus_score(pack_ref_hex=self._pack_ref_hex(pack_id), manifest_summary={'manifest_uri': proj.manifest_uri}, recent_payloads=recent)
        new_score = consensus['score']
        payload = _payload_score_recomputed(previous_score=proj.score, new_score=new_score, consensus_basis=consensus['basis_count'], contributing_telemetry_count=proj.telemetry_count, rationale=consensus['rationale'])
        self._emit(pack_id, EventKind.SCORE_RECOMPUTED, payload)
        return new_score

    @gl.public.write.payable
    def top_up_bond(self, pack_id: str) -> u64:
        bond = self._assert_payable_received(min_value=1)
        proj = self._assert_pack_exists(pack_id)
        self._assert_pack_not_slashed(proj)
        new_total = proj.bonded + bond
        payload = _payload_bond_top_up(by=gl.message.sender_address, amount=bond, new_bonded_total=new_total)
        return self._emit(pack_id, EventKind.BOND_TOPPED_UP, payload, value=bond)

    @gl.public.write
    def withdraw_bond(self, pack_id: str, amount: u256) -> u64:
        self._assert_not_payable()
        proj = self._assert_pack_exists(pack_id)
        self._assert_pack_not_slashed(proj)
        self._assert_caller_is_submitter(proj)
        amt = int(amount)
        if amt <= 0:
            _raise(ERR_BOND_ZERO)
        if proj.bonded - amt <= 0:
            _raise(ERR_BOND_TOO_SMALL_FOR_WITHDRAW, requested=amt, bonded=proj.bonded)
        if proj.score < proj.threshold + WITHDRAW_SAFETY_MARGIN:
            _raise(ERR_BOND_TOO_SMALL_FOR_WITHDRAW, score=proj.score, threshold=proj.threshold, required_margin=WITHDRAW_SAFETY_MARGIN)
        now_seq = int(self.next_seq)
        if proj.last_telemetry_seq and now_seq - proj.last_telemetry_seq < WITHDRAW_COOLDOWN_SEQS:
            _raise(ERR_WITHDRAW_BLOCKED_BY_COOLDOWN, last_telemetry_seq=proj.last_telemetry_seq, now_seq=now_seq, cooldown=WITHDRAW_COOLDOWN_SEQS)
        new_total = proj.bonded - amt
        payload = _payload_bond_withdrawn(by=gl.message.sender_address, amount=amt, new_bonded_total=new_total)
        return self._emit(pack_id, EventKind.BOND_WITHDRAWN, payload)

    @gl.public.write
    def trigger_slash(self, pack_id: str) -> u64:
        self._assert_not_payable()
        proj = self._assert_pack_exists(pack_id)
        self._assert_pack_not_slashed(proj)
        if proj.submitter == gl.message.sender_address:
            _raise(ERR_SLASH_CALLER_IS_SUBMITTER, caller=_hex(_to_bytes(gl.message.sender_address)))
        recall_status = self._fetch_recall_status(proj.vin_hash)
        score_below = proj.score < proj.threshold
        if not score_below and (not recall_status.get('is_recalled', False)):
            _raise(ERR_SLASH_SCORE_ABOVE_THRESHOLD, score=proj.score, threshold=proj.threshold)
        if proj.bonded <= 0:
            _raise(ERR_SLASH_INSUFFICIENT_BOND, bonded=proj.bonded)
        second_opinion = {'concurs': True, 'second_score': proj.score, 'rationale': 'recall override'}
        if score_below:
            recent = self._recent_telemetry_payloads(pack_id, n=8)
            second_opinion = self._llm_slash_second_opinion(pack_ref_hex=self._pack_ref_hex(pack_id), proj=proj, recent_payloads=recent)
            if not second_opinion.get('concurs', False):
                _raise(ERR_SLASH_SECOND_OPINION_REJECT, pack_id=self._pack_ref_hex(pack_id), second_score=second_opinion.get('second_score', 0))
        slashed_amount = proj.bonded
        caller_share, oracle_share = self._split_slash(slashed_amount)
        payload = _payload_slash_triggered(caller=gl.message.sender_address, score_at_slash=proj.score, threshold_at_slash=proj.threshold, bonded_at_slash=proj.bonded, slashed_amount=slashed_amount, caller_share=caller_share, oracle_pool_share=oracle_share, second_opinion=second_opinion, recall_status=recall_status)
        return self._emit(pack_id, EventKind.SLASH_TRIGGERED, payload)

    @gl.public.write
    def pay_oracle(self, pack_id: str, oracle_addr: Address) -> u256:
        self._assert_not_payable()
        proj = self._assert_pack_exists(pack_id)
        if gl.message.sender_address == oracle_addr:
            _raise(ERR_SELF_PAYOUT_FORBIDDEN, addr=_hex(_to_bytes(oracle_addr)))
        oproj = self._replay_oracle(oracle_addr)
        if not oproj.registered:
            _raise(ERR_PAYOUT_ORACLE_NOT_REGISTERED, addr=_hex(_to_bytes(oracle_addr)))
        if oproj.posts < ORACLE_PAYOUT_MIN_POSTS:
            _raise(ERR_PAYOUT_BELOW_MIN_POSTS, posts=oproj.posts, required=ORACLE_PAYOUT_MIN_POSTS)
        if oproj.agreeing_posts <= 0:
            _raise(ERR_PAYOUT_NO_CREDIT, agreeing_posts=oproj.agreeing_posts)
        baseline_unit = max(1, int(proj.cumulative_payouts // max(1, oproj.agreeing_posts)) or 0)
        paid_amount = baseline_unit * oproj.agreeing_posts
        if paid_amount <= 0:
            _raise(ERR_PAYOUT_NO_CREDIT)
        payload = _payload_oracle_paid(oracle=oracle_addr, pack_id=pack_id, paid_amount=paid_amount, agreeing_posts=oproj.agreeing_posts)
        self._emit(pack_id, EventKind.ORACLE_PAID, payload)
        return u256(paid_amount)

    @gl.public.write
    def set_pack_threshold(self, pack_id: str, new_threshold: u8) -> u64:
        self._assert_not_payable()
        proj = self._assert_pack_exists(pack_id)
        self._assert_pack_not_slashed(proj)
        self._assert_caller_is_submitter(proj)
        new_t = self._assert_threshold_in_range(int(new_threshold))
        payload = _payload_threshold_changed(by=gl.message.sender_address, previous=proj.threshold, new=new_t)
        return self._emit(pack_id, EventKind.THRESHOLD_CHANGED, payload)

    @gl.public.write
    def register_oracle(self, license_hint: str) -> u64:
        self._assert_not_payable()
        oproj = self._replay_oracle(gl.message.sender_address)
        if oproj.registered:
            _raise(ERR_ORACLE_ALREADY_REGISTERED, addr=_hex(_to_bytes(gl.message.sender_address)))
        payload = _payload_oracle_registered(addr=gl.message.sender_address, license_hint=license_hint)
        zero_pack = ''
        return self._emit(zero_pack, EventKind.ORACLE_REGISTERED, payload)

    @gl.public.view
    def score(self, pack_id: str) -> int:
        proj = self._assert_pack_exists(pack_id)
        return int(proj.score)

    @gl.public.view
    def pack(self, pack_id: str) -> dict:
        proj = self._assert_pack_exists(pack_id)
        return {'pack_id': self._pack_ref_hex(pack_id), 'exists': proj.exists, 'submitter': _hex(_to_bytes(proj.submitter)), 'vin_hash': _hex(_to_bytes(proj.vin_hash)), 'manifest_uri': proj.manifest_uri, 'threshold': proj.threshold, 'score': proj.score, 'last_score_seq': proj.last_score_seq, 'bonded': proj.bonded, 'slashed': proj.slashed, 'slashed_at_seq': proj.slashed_at_seq, 'telemetry_count': proj.telemetry_count, 'last_telemetry_seq': proj.last_telemetry_seq, 'registered_at_seq': proj.registered_at_seq, 'cumulative_payouts': proj.cumulative_payouts}

    @gl.public.view
    def oracle(self, addr: Address) -> dict:
        oproj = self._replay_oracle(addr)
        return {'addr': _hex(_to_bytes(addr)), 'registered': oproj.registered, 'license_hint': oproj.license_hint, 'posts': oproj.posts, 'agreeing_posts': oproj.agreeing_posts, 'paid_total': oproj.paid_total, 'pending_credit': oproj.pending_credit, 'last_post_seq': oproj.last_post_seq}

    @gl.public.view
    def event_count(self, pack_id: str) -> int:
        c = 0
        for ev in self._iter_events_for_pack(pack_id):
            c += 1
        return c

    @gl.public.view
    def events(self, pack_id: str, offset: u32, limit: u32) -> list:
        off = int(offset)
        lim = int(limit)
        if off < 0 or lim <= 0 or lim > 200:
            _raise(ERR_INVALID_OFFSET_OR_LIMIT, offset=off, limit=lim)
        out = []
        seen = 0
        emitted = 0
        for ev in self._iter_events_for_pack(pack_id):
            if seen >= off and emitted < lim:
                out.append(self._event_view(ev))
                emitted += 1
            seen += 1
            if emitted >= lim:
                break
        return out

    @gl.public.view
    def market_summary(self) -> dict:
        m = self._replay_market()
        return {'packs_registered': m.packs_registered, 'packs_slashed': m.packs_slashed, 'telemetry_events': m.telemetry_events, 'score_recompute_events': m.score_recompute_events, 'slash_events': m.slash_events, 'total_bonded': m.total_bonded, 'total_payouts': m.total_payouts, 'log_length': m.log_length}

    @gl.public.view
    def pending_oracle_credit(self, pack_id: str, oracle_addr: Address) -> int:
        proj = self._assert_pack_exists(pack_id)
        oproj = self._replay_oracle(oracle_addr)
        agreeing_on_pack = self._count_oracle_agreeing_posts_on_pack(oracle_addr, pack_id)
        if agreeing_on_pack <= 0:
            return 0
        baseline = max(1, int(proj.cumulative_payouts // max(1, oproj.agreeing_posts)) or 0)
        return agreeing_on_pack * baseline

    def _count_oracle_agreeing_posts_on_pack(self, oracle: Address, pack_id: str) -> int:
        n = len(self.event_log)
        agreeing = 0
        i = 0
        while i < n:
            ev = self.event_log[i]
            if int(ev.kind) == int(EventKind.TELEMETRY_POSTED) and ev.actor == oracle and (ev.pack_id == pack_id):
                p = _parse_payload(ev.payload)
                coh = p.get('coherence', {}) if isinstance(p, dict) else {}
                oracle_estimate = _safe_int(coh.get('soh_estimate', 0))
                j = i + 1
                examined = 0
                while j < n and examined < ORACLE_AGREEMENT_WINDOW_EVENTS:
                    fwd = self.event_log[j]
                    if fwd.pack_id == pack_id:
                        examined += 1
                        if int(fwd.kind) == int(EventKind.SCORE_RECOMPUTED):
                            fp = _parse_payload(fwd.payload)
                            consensus = _safe_int(fp.get('new_score', -1))
                            if consensus >= 0 and abs(consensus - oracle_estimate) <= ORACLE_AGREEMENT_BAND:
                                agreeing += 1
                            break
                    j += 1
            i += 1
        return agreeing

    @gl.public.view
    def recent_events(self, limit: u32) -> list:
        lim = int(limit)
        if lim <= 0 or lim > 500:
            _raise(ERR_INVALID_OFFSET_OR_LIMIT, offset=0, limit=lim)
        out = []
        n = len(self.event_log)
        i = n - 1
        while i >= 0 and len(out) < lim:
            out.append(self._event_view(self.event_log[i]))
            i -= 1
        return out

    @gl.public.view
    def top_oracles(self, limit: u32) -> list:
        lim = int(limit)
        if lim <= 0 or lim > 100:
            _raise(ERR_INVALID_OFFSET_OR_LIMIT, offset=0, limit=lim)
        seen_addrs = []
        for ev in self._iter_all_events():
            k = int(ev.kind)
            if k in (int(EventKind.ORACLE_REGISTERED), int(EventKind.TELEMETRY_POSTED)):
                a = ev.actor
                already = False
                for x in seen_addrs:
                    if x == a:
                        already = True
                        break
                if not already:
                    seen_addrs.append(a)
        scored = []
        for a in seen_addrs:
            oproj = self._replay_oracle(a)
            scored.append((oproj.agreeing_posts, oproj.posts, a, oproj))
        out = []
        used = [False] * len(scored)
        for _ in range(min(lim, len(scored))):
            best_idx = -1
            best_val = -1
            best_posts = -1
            for j, (ap, p, _a, _o) in enumerate(scored):
                if used[j]:
                    continue
                if ap > best_val or (ap == best_val and p > best_posts):
                    best_val = ap
                    best_posts = p
                    best_idx = j
            if best_idx < 0:
                break
            used[best_idx] = True
            ap, p, a, o = scored[best_idx]
            out.append({'addr': _hex(_to_bytes(a)), 'agreeing_posts': ap, 'posts': p, 'paid_total': o.paid_total})
        return out

    @gl.public.view
    def pack_event_kinds_summary(self, pack_id: str) -> dict:
        counts = {name: 0 for name in KIND_NAMES.values()}
        for ev in self._iter_events_for_pack(pack_id):
            counts[_kind_label(int(ev.kind))] += 1
        return counts

    def _event_view(self, ev: BatteryEvent) -> dict:
        return {'seq': int(ev.seq), 'pack_id': _hex(_to_bytes(ev.pack_id)), 'kind': int(ev.kind), 'kind_name': _kind_label(int(ev.kind)), 'actor': _hex(_to_bytes(ev.actor)), 'value': int(ev.value), 'payload': ev.payload}
