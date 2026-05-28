import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'
const account = createAccount(OPERATOR_KEY)
const client = createClient({ chain: studionet, account })

async function schemaCheck(label, code) {
  process.stdout.write(`${label}... `)
  try {
    const schema = await client.getContractSchemaForCode(code)
    const methods = Object.keys(schema.methods || {})
    console.log(`✅ OK (${methods.length} methods)`)
    return true
  } catch (err) {
    const msg = err.message
    const m = msg.match(/"message":\s*"([^"]+)"/)
    console.log(`❌ FAIL: ${m ? m[1] : 'unknown'}`)
    return false
  }
}

// The base that works
const BASE = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

VALID_CATEGORIES = ["crypto_launch", "creator_influence", "community_sentiment"]
VALID_VERDICTS = ["settled", "inconclusive", "invalid"]
VALID_EVIDENCE_STRENGTHS = ["strong", "moderate", "weak", "insufficient"]
CONTRACT_VERSION = "1.0.0"

class GenSeerMarket(gl.Contract):
    owner: Address
    market_count: u256
    settlement_count: u256
    markets: TreeMap[str, str]
    stakes: TreeMap[str, str]
    user_market_stakes: TreeMap[str, str]
    settlements: TreeMap[str, str]
    claims: TreeMap[str, str]

    def __init__(self):
        self.owner = gl.message.sender_address
        self.market_count = 0
        self.settlement_count = 0

    def _require_non_empty(self, value: str, field: str) -> None:
        if not value or not value.strip():
            raise Exception(f"{field} must not be empty")

    def _safe_parse_list(self, raw: str, field: str) -> list:
        try:
            result = json.loads(raw)
            if not isinstance(result, list):
                raise Exception(f"{field} must be a JSON array")
            return result
        except Exception:
            raise Exception(f"Invalid JSON for {field}")

    def _safe_int(self, value, default: int = 0) -> int:
        try:
            return int(value)
        except Exception:
            return default

    def _load_market(self, market_id: str) -> dict:
        raw = self.markets.get(market_id)
        if raw is None:
            raise Exception(f"Market {market_id} does not exist")
        return json.loads(raw)

    def _save_market(self, market_id: str, market: dict) -> None:
        self.markets[market_id] = json.dumps(market)

    def _load_user_stake(self, market_id: str, user_address: str) -> dict:
        key = f"{market_id}:{user_address}"
        raw = self.user_market_stakes.get(key)
        if raw is None:
            return {"market_id": market_id, "user": user_address,
                    "stakes_by_outcome": [], "total_staked": 0,
                    "claimed": False, "claim_type": None, "claim_amount": 0}
        return json.loads(raw)

    def _save_user_stake(self, market_id: str, user_address: str, stake: dict) -> None:
        key = f"{market_id}:{user_address}"
        self.user_market_stakes[key] = json.dumps(stake)

    def _validate_liquidity(self, market: dict) -> bool:
        total_pool = self._safe_int(market.get("total_pool", 0))
        min_pool = self._safe_int(market.get("minimum_total_pool", 100))
        if total_pool < min_pool:
            return False
        outcome_pools = market.get("outcome_pools", [])
        funded = sum(1 for p in outcome_pools if self._safe_int(p) > 0)
        if funded < 2:
            return False
        sorted_pools = sorted([self._safe_int(p) for p in outcome_pools], reverse=True)
        if len(sorted_pools) < 2:
            return False
        second_largest = sorted_pools[1]
        min_opposing_bps = self._safe_int(market.get("minimum_opposing_ratio_bps", 1000))
        if total_pool > 0:
            ratio_bps = (second_largest * 10000) // total_pool
            if ratio_bps < min_opposing_bps:
                return False
        return True

    def _calculate_payout_amount(self, market: dict, user_stake: dict) -> int:
        winning_index = market.get("winning_outcome_index")
        if winning_index is None:
            return 0
        winning_index = self._safe_int(winning_index)
        outcome_pools = market.get("outcome_pools", [])
        if winning_index >= len(outcome_pools):
            return 0
        total_pool = self._safe_int(market.get("total_pool", 0))
        winning_pool = self._safe_int(outcome_pools[winning_index])
        if winning_pool == 0:
            return 0
        platform_fee_bps = self._safe_int(market.get("platform_fee_bps", 500))
        platform_fee = (total_pool * platform_fee_bps) // 10000
        distributable = total_pool - platform_fee
        stakes_by_outcome = user_stake.get("stakes_by_outcome", [])
        if winning_index >= len(stakes_by_outcome):
            return 0
        user_stake_in_winning = self._safe_int(stakes_by_outcome[winning_index])
        if user_stake_in_winning == 0:
            return 0
        return (user_stake_in_winning * distributable) // winning_pool

    def _calculate_refund_amount(self, user_stake: dict) -> int:
        return self._safe_int(user_stake.get("total_staked", 0))

    def _safe_parse_ruling(self, raw_ruling: str, outcomes: list) -> dict:
        default = {"verdict": "inconclusive", "winning_outcome_index": None,
                   "winning_outcome_label": None, "confidence": 1,
                   "evidence_strength": "insufficient",
                   "sentiment_analysis": "Parsing failed",
                   "metrics_analysis": "Parsing failed",
                   "sceptic_analysis": "Parsing failed",
                   "context_analysis": "Parsing failed",
                   "reasoning": "Settlement parsing failed. Refund recommended.",
                   "evidence_summary": "No summary available",
                   "counterarguments": "", "refund_recommended": True}
        try:
            start = raw_ruling.find("{")
            end = raw_ruling.rfind("}") + 1
            if start == -1 or end == 0:
                return default
            ruling = json.loads(raw_ruling[start:end])
            verdict = ruling.get("verdict", "inconclusive")
            if verdict not in VALID_VERDICTS:
                verdict = "inconclusive"
            evidence_strength = ruling.get("evidence_strength", "insufficient")
            if evidence_strength not in VALID_EVIDENCE_STRENGTHS:
                evidence_strength = "insufficient"
            confidence = self._safe_int(ruling.get("confidence", 1))
            confidence = max(1, min(100, confidence))
            winning_index = ruling.get("winning_outcome_index")
            winning_label = None
            if verdict == "settled" and winning_index is not None:
                winning_index = self._safe_int(winning_index)
                if 0 <= winning_index < len(outcomes):
                    winning_label = outcomes[winning_index]
                else:
                    verdict = "inconclusive"
                    winning_index = None
            refund_recommended = ruling.get("refund_recommended", verdict != "settled")
            if verdict != "settled":
                refund_recommended = True
            return {"verdict": verdict, "winning_outcome_index": winning_index,
                    "winning_outcome_label": winning_label, "confidence": confidence,
                    "evidence_strength": evidence_strength,
                    "sentiment_analysis": ruling.get("sentiment_analysis", ""),
                    "metrics_analysis": ruling.get("metrics_analysis", ""),
                    "sceptic_analysis": ruling.get("sceptic_analysis", ""),
                    "context_analysis": ruling.get("context_analysis", ""),
                    "reasoning": ruling.get("reasoning", ""),
                    "evidence_summary": ruling.get("evidence_summary", ""),
                    "counterarguments": ruling.get("counterarguments", ""),
                    "refund_recommended": refund_recommended}
        except Exception:
            return default

    @gl.public.view
    def contract_version(self) -> str:
        return CONTRACT_VERSION

    @gl.public.view
    def total_markets(self) -> u256:
        return self.market_count

    @gl.public.view
    def total_settlements(self) -> u256:
        return self.settlement_count

    @gl.public.view
    def get_market(self, market_id: str) -> str:
        raw = self.markets.get(market_id)
        if raw is None:
            return json.dumps({"error": "Market not found"})
        return raw

    @gl.public.view
    def get_market_stakes(self, market_id: str) -> str:
        raw = self.stakes.get(market_id)
        if raw is None:
            return json.dumps([])
        return raw

    @gl.public.view
    def get_user_market_stake(self, market_id: str, user_address: str) -> str:
        key = f"{market_id}:{user_address}"
        raw = self.user_market_stakes.get(key)
        if raw is None:
            return json.dumps({"market_id": market_id, "user": user_address,
                               "stakes_by_outcome": [], "total_staked": 0,
                               "claimed": False, "claim_type": None, "claim_amount": 0})
        return raw

    @gl.public.view
    def get_market_settlement(self, market_id: str) -> str:
        raw = self.settlements.get(market_id)
        if raw is None:
            return json.dumps({"error": "No settlement found"})
        return raw

    @gl.public.view
    def get_claim_status(self, market_id: str, user_address: str) -> str:
        key = f"{market_id}:{user_address}"
        raw = self.claims.get(key)
        if raw is None:
            return json.dumps({"claimed": False})
        return raw

    @gl.public.view
    def calculate_payout(self, market_id: str, user_address: str) -> str:
        market = self._load_market(market_id)
        user_stake = self._load_user_stake(market_id, user_address)
        amount = self._calculate_payout_amount(market, user_stake)
        return json.dumps({"market_id": market_id, "user": user_address,
                           "payout_amount": amount,
                           "already_claimed": user_stake.get("claimed", False)})

    @gl.public.view
    def calculate_refund(self, market_id: str, user_address: str) -> str:
        user_stake = self._load_user_stake(market_id, user_address)
        amount = self._calculate_refund_amount(user_stake)
        return json.dumps({"market_id": market_id, "user": user_address,
                           "refund_amount": amount,
                           "already_claimed": user_stake.get("claimed", False)})
`

const CREATE_MARKET = `
    @gl.public.write
    def create_market(
        self,
        market_id: str,
        creator_address: str,
        title: str,
        category: str,
        outcomes_json: str,
        close_at: u256,
        evidence_ends_at: u256,
        settlement_at: u256,
        settlement_criteria: str,
        approved_sources_json: str,
        minimum_total_pool: u256,
        minimum_opposing_ratio_bps: u256,
        platform_fee_bps: u256,
    ) -> str:
        self._require_non_empty(market_id, "market_id")
        self._require_non_empty(title, "title")
        self._require_non_empty(settlement_criteria, "settlement_criteria")
        if self.markets.get(market_id) is not None:
            raise Exception(f"Market {market_id} already exists")
        if category not in VALID_CATEGORIES:
            raise Exception(f"Invalid category: {category}. Must be one of {VALID_CATEGORIES}")
        outcomes = self._safe_parse_list(outcomes_json, "outcomes")
        if len(outcomes) < 2:
            raise Exception("At least two outcomes are required")
        approved_sources = self._safe_parse_list(approved_sources_json, "approved_sources")
        if int(platform_fee_bps) > 1000:
            raise Exception("platform_fee_bps must be <= 1000")
        if int(minimum_opposing_ratio_bps) > 5000:
            raise Exception("minimum_opposing_ratio_bps must be <= 5000")
        now = int(gl.message.timestamp) if hasattr(gl.message, 'timestamp') else 0
        market = {
            "market_id": market_id, "creator": creator_address, "title": title,
            "category": category, "outcomes": outcomes, "status": "open",
            "close_at": int(close_at), "evidence_ends_at": int(evidence_ends_at),
            "settlement_at": int(settlement_at), "settlement_criteria": settlement_criteria,
            "approved_sources": approved_sources,
            "minimum_total_pool": int(minimum_total_pool),
            "minimum_opposing_ratio_bps": int(minimum_opposing_ratio_bps),
            "platform_fee_bps": int(platform_fee_bps),
            "total_pool": 0, "outcome_pools": [0] * len(outcomes),
            "funded_outcomes": 0, "winning_outcome_index": None,
            "winning_outcome_label": None, "refund_recommended": False,
            "created_at": now, "settled_at": None,
        }
        self._save_market(market_id, market)
        self.stakes[market_id] = json.dumps([])
        self.market_count = self.market_count + 1
        return json.dumps({"success": True, "market_id": market_id})
`

const STAKE = `
    @gl.public.write
    def stake(self, market_id: str, outcome_index: u256, amount: u256) -> str:
        market = self._load_market(market_id)
        if market["status"] != "open":
            raise Exception(f"Market is not open for staking (status: {market['status']})")
        if int(amount) <= 0:
            raise Exception("Stake amount must be greater than 0")
        outcomes = market.get("outcomes", [])
        if int(outcome_index) >= len(outcomes):
            raise Exception(f"Invalid outcome_index {outcome_index}. Market has {len(outcomes)} outcomes")
        user_address = str(gl.message.sender_address)
        idx = int(outcome_index)
        amt = int(amount)
        user_stake = self._load_user_stake(market_id, user_address)
        if not user_stake["stakes_by_outcome"]:
            user_stake["stakes_by_outcome"] = [0] * len(outcomes)
        while len(user_stake["stakes_by_outcome"]) < len(outcomes):
            user_stake["stakes_by_outcome"].append(0)
        user_stake["stakes_by_outcome"][idx] += amt
        user_stake["total_staked"] = user_stake.get("total_staked", 0) + amt
        self._save_user_stake(market_id, user_address, user_stake)
        outcome_pools = market.get("outcome_pools", [0] * len(outcomes))
        was_zero = outcome_pools[idx] == 0
        outcome_pools[idx] += amt
        market["outcome_pools"] = outcome_pools
        market["total_pool"] = market.get("total_pool", 0) + amt
        if was_zero:
            market["funded_outcomes"] = market.get("funded_outcomes", 0) + 1
        self._save_market(market_id, market)
        stake_record = {
            "user": user_address, "outcome_index": idx, "amount": amt,
            "timestamp": int(gl.message.timestamp) if hasattr(gl.message, 'timestamp') else 0,
        }
        existing_stakes = json.loads(self.stakes.get(market_id, "[]"))
        existing_stakes.append(stake_record)
        self.stakes[market_id] = json.dumps(existing_stakes)
        return json.dumps({"success": True, "market_id": market_id,
                           "outcome_index": idx, "amount": amt,
                           "new_outcome_pool": outcome_pools[idx],
                           "new_total_pool": market["total_pool"]})
`

const SIMPLE_WRITES = `
    @gl.public.write
    def close_market(self, market_id: str) -> str:
        market = self._load_market(market_id)
        if market["status"] != "open":
            raise Exception(f"Market must be open to close (status: {market['status']})")
        market["status"] = "closed"
        self._save_market(market_id, market)
        return json.dumps({"success": True, "market_id": market_id, "status": "closed"})

    @gl.public.write
    def open_evidence_phase(self, market_id: str) -> str:
        market = self._load_market(market_id)
        if market["status"] != "closed":
            raise Exception(f"Market must be closed to enter evidence phase (status: {market['status']})")
        market["status"] = "evidence_phase"
        self._save_market(market_id, market)
        return json.dumps({"success": True, "market_id": market_id, "status": "evidence_phase"})
`

const SETTLE = `
    @gl.public.write
    def settle_market(
        self,
        market_id: str,
        evidence_json: str,
        challenges_json: str,
        pool_summary_json: str,
    ) -> str:
        market = self._load_market(market_id)
        if market["status"] not in ["evidence_phase", "closed"]:
            raise Exception(f"Market must be in evidence_phase or closed to settle (status: {market['status']})")
        market["status"] = "settlement_pending"
        self._save_market(market_id, market)
        liquidity_valid = self._validate_liquidity(market)
        if not liquidity_valid:
            market["status"] = "invalid"
            market["refund_recommended"] = True
            self._save_market(market_id, market)
            settlement = {
                "market_id": market_id, "verdict": "invalid",
                "winning_outcome_index": None, "winning_outcome_label": None,
                "confidence": 0, "evidence_strength": "insufficient",
                "sentiment_analysis": "Market failed liquidity validation",
                "metrics_analysis": "Insufficient opposing liquidity",
                "sceptic_analysis": "Market does not meet minimum liquidity requirements",
                "context_analysis": "Liquidity validation failed",
                "reasoning": "This market did not meet minimum liquidity requirements. Refund recommended.",
                "evidence_summary": "Liquidity check failed before evidence review",
                "counterarguments": "", "refund_recommended": True,
            }
            self.settlements[market_id] = json.dumps(settlement)
            self.settlement_count = self.settlement_count + 1
            return json.dumps({"success": True, "verdict": "invalid", "refund_recommended": True})
        try:
            evidence = json.loads(evidence_json) if evidence_json else []
            challenges = json.loads(challenges_json) if challenges_json else []
            pool_summary = json.loads(pool_summary_json) if pool_summary_json else {}
        except Exception:
            evidence = []
            challenges = []
            pool_summary = {}
        outcomes = market.get("outcomes", [])
        outcome_pools = market.get("outcome_pools", [])
        total_pool = market.get("total_pool", 0)
        outcome_pool_display = []
        for i, label in enumerate(outcomes):
            pool_val = outcome_pools[i] if i < len(outcome_pools) else 0
            prob = (pool_val * 100 // total_pool) if total_pool > 0 else 0
            outcome_pool_display.append({"index": i, "label": label, "pool": pool_val,
                                          "implied_probability_pct": prob})
        settlement_prompt = f"""You are the decentralized settlement judge for GenSeer, a GenLayer-native subjective prediction market.

Use only the supplied evidence and rules. Do not invent facts. Do not reward vague hype. Pools show market belief, not truth.

MARKET: {market.get('title', '')}
CATEGORY: {market.get('category', '')}
SETTLEMENT CRITERIA: {market.get('settlement_criteria', '')}
APPROVED SOURCES: {json.dumps(market.get('approved_sources', []))}

OUTCOMES:
{json.dumps(outcome_pool_display, indent=2)}

EVIDENCE SUBMITTED:
{json.dumps(evidence, indent=2)}

EVIDENCE CHALLENGES:
{json.dumps(challenges, indent=2)}

POOL SUMMARY:
{json.dumps(pool_summary, indent=2)}

Analyse:
1. sentiment - overall sentiment of credible evidence toward each outcome
2. metrics - any measurable data points in evidence (usage, growth, engagement)
3. sceptic concerns - credible challenges, fake evidence, bots, biased sources
4. context fit - how well evidence matches the settlement criteria

Return ONLY valid JSON (no markdown, no code blocks, raw JSON only):

{{
  "verdict": "settled" | "inconclusive" | "invalid",
  "winning_outcome_index": 0,
  "winning_outcome_label": "Strong adoption",
  "confidence": 75,
  "evidence_strength": "strong" | "moderate" | "weak" | "insufficient",
  "sentiment_analysis": "...",
  "metrics_analysis": "...",
  "sceptic_analysis": "...",
  "context_analysis": "...",
  "reasoning": "...",
  "evidence_summary": "...",
  "counterarguments": "...",
  "refund_recommended": false
}}

Rules:
- confidence must be 1 to 100
- verdict must be settled, inconclusive, or invalid
- evidence_strength must be strong, moderate, weak, or insufficient
- refund_recommended must be true if verdict is not settled
- refund_recommended must be true if evidence is insufficient
- winning_outcome_index must be valid index from the outcomes list
- Do not invent facts. Judge only from supplied evidence and criteria.
- If evidence is absent, contradictory, or insufficient, return inconclusive."""
        raw_ruling = gl.get_webpage(settlement_prompt, mode="text")
        ruling = self._safe_parse_ruling(raw_ruling, outcomes)
        now = int(gl.message.timestamp) if hasattr(gl.message, 'timestamp') else 0
        if ruling["verdict"] == "settled" and ruling["winning_outcome_index"] is not None:
            market["status"] = "settled"
            market["winning_outcome_index"] = ruling["winning_outcome_index"]
            market["winning_outcome_label"] = ruling["winning_outcome_label"]
            market["refund_recommended"] = False
            market["settled_at"] = now
        else:
            market["status"] = "invalid"
            market["refund_recommended"] = True
            market["settled_at"] = now
        self._save_market(market_id, market)
        settlement = {
            "market_id": market_id, "verdict": ruling["verdict"],
            "winning_outcome_index": ruling["winning_outcome_index"],
            "winning_outcome_label": ruling["winning_outcome_label"],
            "confidence": ruling["confidence"],
            "evidence_strength": ruling["evidence_strength"],
            "sentiment_analysis": ruling["sentiment_analysis"],
            "metrics_analysis": ruling["metrics_analysis"],
            "sceptic_analysis": ruling["sceptic_analysis"],
            "context_analysis": ruling["context_analysis"],
            "reasoning": ruling["reasoning"],
            "evidence_summary": ruling["evidence_summary"],
            "counterarguments": ruling["counterarguments"],
            "refund_recommended": ruling["refund_recommended"],
            "settled_at": now,
        }
        self.settlements[market_id] = json.dumps(settlement)
        self.settlement_count = self.settlement_count + 1
        return json.dumps({"success": True, "verdict": ruling["verdict"],
                           "winning_outcome_index": ruling["winning_outcome_index"],
                           "winning_outcome_label": ruling["winning_outcome_label"],
                           "confidence": ruling["confidence"],
                           "refund_recommended": ruling["refund_recommended"]})
`

const CLAIMS = `
    @gl.public.write
    def claim_payout(self, market_id: str) -> str:
        market = self._load_market(market_id)
        if market["status"] != "settled":
            raise Exception(f"Market must be settled for payout claims (status: {market['status']})")
        user_address = str(gl.message.sender_address)
        user_stake = self._load_user_stake(market_id, user_address)
        if user_stake.get("claimed", False):
            raise Exception("User has already claimed for this market")
        payout = self._calculate_payout_amount(market, user_stake)
        if payout == 0:
            raise Exception("No payout entitlement for this address in the winning outcome")
        user_stake["claimed"] = True
        user_stake["claim_type"] = "payout"
        user_stake["claim_amount"] = payout
        self._save_user_stake(market_id, user_address, user_stake)
        now = int(gl.message.timestamp) if hasattr(gl.message, 'timestamp') else 0
        claim_key = f"{market_id}:{user_address}"
        self.claims[claim_key] = json.dumps({"market_id": market_id, "user": user_address,
                                              "claim_type": "payout", "amount": payout,
                                              "claimed_at": now})
        return json.dumps({"success": True, "market_id": market_id,
                           "claim_type": "payout", "amount": payout})

    @gl.public.write
    def claim_refund(self, market_id: str) -> str:
        market = self._load_market(market_id)
        if market["status"] not in ["invalid", "cancelled"]:
            raise Exception(f"Market must be invalid or cancelled for refund claims (status: {market['status']})")
        user_address = str(gl.message.sender_address)
        user_stake = self._load_user_stake(market_id, user_address)
        if user_stake.get("claimed", False):
            raise Exception("User has already claimed for this market")
        refund = self._calculate_refund_amount(user_stake)
        if refund == 0:
            raise Exception("No refund entitlement: no stake recorded for this address")
        user_stake["claimed"] = True
        user_stake["claim_type"] = "refund"
        user_stake["claim_amount"] = refund
        self._save_user_stake(market_id, user_address, user_stake)
        now = int(gl.message.timestamp) if hasattr(gl.message, 'timestamp') else 0
        claim_key = f"{market_id}:{user_address}"
        self.claims[claim_key] = json.dumps({"market_id": market_id, "user": user_address,
                                              "claim_type": "refund", "amount": refund,
                                              "claimed_at": now})
        return json.dumps({"success": True, "market_id": market_id,
                           "claim_type": "refund", "amount": refund})

    @gl.public.write
    def cancel_market(self, market_id: str) -> str:
        market = self._load_market(market_id)
        caller = str(gl.message.sender_address)
        if market.get("creator") != caller and str(self.owner) != caller:
            raise Exception("Only the market creator or contract owner can cancel a market")
        if market["status"] in ["settled", "invalid", "refunded", "cancelled"]:
            raise Exception(f"Cannot cancel market in status: {market['status']}")
        market["status"] = "cancelled"
        market["refund_recommended"] = True
        self._save_market(market_id, market)
        return json.dumps({"success": True, "market_id": market_id, "status": "cancelled"})
`

await schemaCheck('base + create_market', BASE + CREATE_MARKET)
await schemaCheck('base + create_market + stake', BASE + CREATE_MARKET + STAKE)
await schemaCheck('base + create_market + stake + simple writes', BASE + CREATE_MARKET + STAKE + SIMPLE_WRITES)
await schemaCheck('base + all writes except settle', BASE + CREATE_MARKET + STAKE + SIMPLE_WRITES + CLAIMS)
await schemaCheck('base + all writes + settle_market', BASE + CREATE_MARKET + STAKE + SIMPLE_WRITES + SETTLE + CLAIMS)
