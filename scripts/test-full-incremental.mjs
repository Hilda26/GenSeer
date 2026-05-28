/**
 * Incrementally add methods back to the full contract until it breaks
 */
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
    console.log(`✅ OK (${methods.length} methods: ${methods.slice(0,3).join(',')})`)
    return true
  } catch (err) {
    const msg = err.message
    const m = msg.match(/"message":\s*"([^"]+)"/)
    // Also try to extract stderr/stdout
    const stdout = msg.match(/"stdout":\s*"([^"]*)"/)
    const stderr = msg.match(/"stderr":\s*"([^"]*)"/)
    console.log(`❌ FAIL: ${m ? m[1] : 'unknown'}`)
    if (stdout?.[1]) console.log('  stdout:', stdout[1].slice(0,200))
    if (stderr?.[1]) console.log('  stderr:', stderr[1].slice(0,200))
    return false
  }
}

const H = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json

VALID_CATEGORIES = ["crypto_launch", "creator_influence", "community_sentiment"]
VALID_VERDICTS = ["settled", "inconclusive", "invalid"]
VALID_EVIDENCE_STRENGTHS = ["strong", "moderate", "weak", "insufficient"]
CONTRACT_VERSION = "1.0.0"
`

const STORAGE = `
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
`

const HELPERS = `
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
            return {
                "market_id": market_id,
                "user": user_address,
                "stakes_by_outcome": [],
                "total_staked": 0,
                "claimed": False,
                "claim_type": None,
                "claim_amount": 0,
            }
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
        payout = (user_stake_in_winning * distributable) // winning_pool
        return payout

    def _calculate_refund_amount(self, user_stake: dict) -> int:
        return self._safe_int(user_stake.get("total_staked", 0))

    def _safe_parse_ruling(self, raw_ruling: str, outcomes: list) -> dict:
        default = {
            "verdict": "inconclusive",
            "winning_outcome_index": None,
            "winning_outcome_label": None,
            "confidence": 1,
            "evidence_strength": "insufficient",
            "sentiment_analysis": "Parsing failed",
            "metrics_analysis": "Parsing failed",
            "sceptic_analysis": "Parsing failed",
            "context_analysis": "Parsing failed",
            "reasoning": "Settlement parsing failed. Refund recommended.",
            "evidence_summary": "No summary available",
            "counterarguments": "",
            "refund_recommended": True,
        }
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
            return {
                "verdict": verdict,
                "winning_outcome_index": winning_index,
                "winning_outcome_label": winning_label,
                "confidence": confidence,
                "evidence_strength": evidence_strength,
                "sentiment_analysis": ruling.get("sentiment_analysis", ""),
                "metrics_analysis": ruling.get("metrics_analysis", ""),
                "sceptic_analysis": ruling.get("sceptic_analysis", ""),
                "context_analysis": ruling.get("context_analysis", ""),
                "reasoning": ruling.get("reasoning", ""),
                "evidence_summary": ruling.get("evidence_summary", ""),
                "counterarguments": ruling.get("counterarguments", ""),
                "refund_recommended": refund_recommended,
            }
        except Exception:
            return default
`

const VIEWS = `
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
            return json.dumps({
                "market_id": market_id,
                "user": user_address,
                "stakes_by_outcome": [],
                "total_staked": 0,
                "claimed": False,
                "claim_type": None,
                "claim_amount": 0,
            })
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
        return json.dumps({
            "market_id": market_id,
            "user": user_address,
            "payout_amount": amount,
            "already_claimed": user_stake.get("claimed", False),
        })

    @gl.public.view
    def calculate_refund(self, market_id: str, user_address: str) -> str:
        user_stake = self._load_user_stake(market_id, user_address)
        amount = self._calculate_refund_amount(user_stake)
        return json.dumps({
            "market_id": market_id,
            "user": user_address,
            "refund_amount": amount,
            "already_claimed": user_stake.get("claimed", False),
        })
`

await schemaCheck('storage + init', H + STORAGE + `    @gl.public.view\n    def v(self) -> str: return "ok"\n`)
await schemaCheck('+ helpers', H + STORAGE + HELPERS + `    @gl.public.view\n    def v(self) -> str: return "ok"\n`)
await schemaCheck('+ views', H + STORAGE + HELPERS + VIEWS)
