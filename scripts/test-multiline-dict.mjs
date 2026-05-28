/**
 * Test if multi-line dict literals in helpers cause the schema failure
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
    console.log(`✅ OK (${Object.keys(schema.methods || {}).length} methods)`)
    return true
  } catch (err) {
    const m = err.message.match(/"message":\s*"([^"]+)"/)
    console.log(`❌ FAIL: ${m ? m[1] : 'unknown'}`)
    return false
  }
}

const H = `# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
from genlayer import *
import json
`

// Test: multi-line dict with trailing commas in return statement
await schemaCheck('multi-line dict return with trailing comma', H + `
class TestMultiLineDict(gl.Contract):
    data: TreeMap[str, str]
    def __init__(self): pass

    def _get_default(self, market_id: str, user_address: str) -> dict:
        key = f"{market_id}:{user_address}"
        raw = self.data.get(key)
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

    @gl.public.view
    def get(self, k: str, u: str) -> str:
        d = self._get_default(k, u)
        return json.dumps(d)
`)

// Test: _safe_parse_ruling exact copy from original
await schemaCheck('_safe_parse_ruling exact copy', H + `
VALID_VERDICTS = ["settled", "inconclusive", "invalid"]
VALID_EVIDENCE_STRENGTHS = ["strong", "moderate", "weak", "insufficient"]

class TestSafeParse(gl.Contract):
    def __init__(self): pass

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

    @gl.public.view
    def test(self, raw: str) -> str:
        return json.dumps(self._safe_parse_ruling(raw, ["yes", "no"]))
`)

// Test: market dict with multi-line format from create_market
await schemaCheck('create_market multi-line dict literal', H + `
VALID_CATEGORIES = ["crypto_launch", "creator_influence", "community_sentiment"]

class TestCreateMarket(gl.Contract):
    markets: TreeMap[str, str]
    market_count: u256
    stakes: TreeMap[str, str]
    def __init__(self):
        self.market_count = 0

    def _safe_parse_list(self, raw: str, field: str) -> list:
        try:
            result = json.loads(raw)
            if not isinstance(result, list):
                raise Exception(f"{field} must be a JSON array")
            return result
        except Exception:
            raise Exception(f"Invalid JSON for {field}")

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
        self._require_non_empty(market_id, "market_id") if False else None
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
        now = int(gl.message.timestamp) if hasattr(gl.message, "timestamp") else 0
        market = {
            "market_id": market_id,
            "creator": creator_address,
            "title": title,
            "category": category,
            "outcomes": outcomes,
            "status": "open",
            "close_at": int(close_at),
            "evidence_ends_at": int(evidence_ends_at),
            "settlement_at": int(settlement_at),
            "settlement_criteria": settlement_criteria,
            "approved_sources": approved_sources,
            "minimum_total_pool": int(minimum_total_pool),
            "minimum_opposing_ratio_bps": int(minimum_opposing_ratio_bps),
            "platform_fee_bps": int(platform_fee_bps),
            "total_pool": 0,
            "outcome_pools": [0] * len(outcomes),
            "funded_outcomes": 0,
            "winning_outcome_index": None,
            "winning_outcome_label": None,
            "refund_recommended": False,
            "created_at": now,
            "settled_at": None,
        }
        self.markets[market_id] = json.dumps(market)
        self.stakes[market_id] = json.dumps([])
        self.market_count = self.market_count + 1
        return json.dumps({"success": True, "market_id": market_id})
`)
