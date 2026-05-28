/**
 * Binary-search which part of genseer_market.py causes VM_ERROR: invalid_contract
 */
import { createClient, createAccount } from 'genlayer-js'
import { studionet } from 'genlayer-js/chains'

const OPERATOR_KEY = '0x5e2df62b4d4cad0ccd45a7afa275bcc3eab2c7c4a27e0dd16a8a80b49996c6ed'
const account = createAccount(OPERATOR_KEY)
const client = createClient({ chain: studionet, account })

async function schemaCheck(label, code) {
  process.stdout.write(`Schema: ${label}... `)
  try {
    const schema = await client.getContractSchemaForCode(code)
    console.log('✅ OK —', Object.keys(schema.methods || {}).length, 'methods')
    return true
  } catch (err) {
    const msg = err.message
    // extract just the VM result
    const m = msg.match(/"message":\s*"([^"]+)"/)
    console.log('❌ FAIL:', m ? m[1] : msg.slice(0, 100))
    return false
  }
}

const HEADER = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
`

// Step 1: Just storage + init + helpers
await schemaCheck('storage + init + helpers', HEADER + `
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

    @gl.public.view
    def contract_version(self) -> str:
        return CONTRACT_VERSION
`)

// Step 2: Add view methods
await schemaCheck('+ all view methods', HEADER + `
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

    def _safe_int(self, value, default: int = 0) -> int:
        try:
            return int(value)
        except Exception:
            return default

    @gl.public.view
    def contract_version(self) -> str:
        return CONTRACT_VERSION

    @gl.public.view
    def total_markets(self) -> u256:
        return self.market_count

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
`)

// Step 3: Add write methods WITHOUT settle_market
await schemaCheck('+ write methods (no settle_market)', HEADER + `
from genlayer import *
import json

VALID_CATEGORIES = ["crypto_launch", "creator_influence", "community_sentiment"]
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

    @gl.public.view
    def get_market(self, market_id: str) -> str:
        raw = self.markets.get(market_id)
        if raw is None:
            return json.dumps({"error": "Market not found"})
        return raw

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
        if not market_id:
            raise Exception("market_id required")
        outcomes = json.loads(outcomes_json)
        market = {
            "market_id": market_id,
            "title": title,
            "category": category,
            "outcomes": outcomes,
            "status": "open",
            "total_pool": 0,
        }
        self._save_market(market_id, market)
        self.market_count = self.market_count + 1
        return json.dumps({"success": True, "market_id": market_id})

    @gl.public.write
    def close_market(self, market_id: str) -> str:
        market = self._load_market(market_id)
        market["status"] = "closed"
        self._save_market(market_id, market)
        return json.dumps({"success": True})

    @gl.public.write
    def cancel_market(self, market_id: str) -> str:
        market = self._load_market(market_id)
        market["status"] = "cancelled"
        self._save_market(market_id, market)
        return json.dumps({"success": True})
`)

// Step 4: settle_market with gl.get_webpage but SHORT prompt
await schemaCheck('settle_market with short prompt via gl.get_webpage', HEADER + `
from genlayer import *
import json

class GenSeerMarket(gl.Contract):
    markets: TreeMap[str, str]
    settlements: TreeMap[str, str]

    def __init__(self):
        pass

    @gl.public.write
    def settle_market(self, market_id: str, evidence_json: str) -> str:
        raw = self.markets.get(market_id)
        if raw is None:
            raise Exception("Market not found")
        prompt = f"Should market {market_id} resolve YES or NO based on: {evidence_json}? Answer YES or NO only."
        ruling = gl.get_webpage(prompt, mode="text")
        result = {"market_id": market_id, "verdict": ruling.strip()[:10]}
        self.settlements[market_id] = json.dumps(result)
        return json.dumps(result)
`)

// Step 5: The exact settle_market body from the full contract
await schemaCheck('settle_market with full prompt (exact from contract)', HEADER + `
from genlayer import *
import json

VALID_VERDICTS = ["settled", "inconclusive", "invalid"]
VALID_EVIDENCE_STRENGTHS = ["strong", "moderate", "weak", "insufficient"]

class GenSeerMarket(gl.Contract):
    markets: TreeMap[str, str]
    settlements: TreeMap[str, str]
    settlement_count: u256

    def __init__(self):
        self.settlement_count = 0

    def _safe_int(self, value, default: int = 0) -> int:
        try:
            return int(value)
        except Exception:
            return default

    def _safe_parse_ruling(self, raw_ruling: str, outcomes: list) -> dict:
        default = {
            "verdict": "inconclusive",
            "winning_outcome_index": None,
            "winning_outcome_label": None,
            "confidence": 1,
            "evidence_strength": "insufficient",
            "reasoning": "Settlement parsing failed.",
            "evidence_summary": "No summary available",
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
            return {
                "verdict": verdict,
                "winning_outcome_index": ruling.get("winning_outcome_index"),
                "winning_outcome_label": ruling.get("winning_outcome_label"),
                "confidence": self._safe_int(ruling.get("confidence", 1)),
                "evidence_strength": ruling.get("evidence_strength", "insufficient"),
                "reasoning": ruling.get("reasoning", ""),
                "evidence_summary": ruling.get("evidence_summary", ""),
                "refund_recommended": ruling.get("refund_recommended", verdict != "settled"),
            }
        except Exception:
            return default

    @gl.public.write
    def settle_market(
        self,
        market_id: str,
        evidence_json: str,
        challenges_json: str,
        pool_summary_json: str,
    ) -> str:
        raw = self.markets.get(market_id)
        if raw is None:
            raise Exception("Market not found")
        market = json.loads(raw)

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
            outcome_pool_display.append({
                "index": i,
                "label": label,
                "pool": pool_val,
                "implied_probability_pct": prob,
            })

        settlement_prompt = f"""You are the decentralized settlement judge for GenSeer, a GenLayer-native subjective prediction market.

Use only the supplied evidence and rules. Do not invent facts. Do not reward vague hype. Pools show market belief, not truth.

MARKET: {market.get("title", "")}
CATEGORY: {market.get("category", "")}
SETTLEMENT CRITERIA: {market.get("settlement_criteria", "")}
APPROVED SOURCES: {json.dumps(market.get("approved_sources", []))}

OUTCOMES:
{json.dumps(outcome_pool_display, indent=2)}

EVIDENCE SUBMITTED:
{json.dumps(evidence, indent=2)}

EVIDENCE CHALLENGES:
{json.dumps(challenges, indent=2)}

POOL SUMMARY:
{json.dumps(pool_summary, indent=2)}

Return ONLY valid JSON:

{{
  "verdict": "settled" | "inconclusive" | "invalid",
  "winning_outcome_index": 0,
  "winning_outcome_label": "...",
  "confidence": 75,
  "evidence_strength": "strong" | "moderate" | "weak" | "insufficient",
  "reasoning": "...",
  "evidence_summary": "...",
  "refund_recommended": false
}}"""

        raw_ruling = gl.get_webpage(settlement_prompt, mode="text")
        ruling = self._safe_parse_ruling(raw_ruling, outcomes)

        market["status"] = "settled" if ruling["verdict"] == "settled" else "invalid"
        self.markets[market_id] = json.dumps(market)

        settlement = {
            "market_id": market_id,
            "verdict": ruling["verdict"],
            "winning_outcome_index": ruling["winning_outcome_index"],
            "refund_recommended": ruling["refund_recommended"],
        }
        self.settlements[market_id] = json.dumps(settlement)
        self.settlement_count = self.settlement_count + 1

        return json.dumps({"success": True, "verdict": ruling["verdict"]})
`)
