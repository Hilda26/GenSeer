# GenSeer

**Turn internet debates into GenLayer-settled markets**

GenSeer is a GenLayer-native parimutuel prediction market for subjective internet-native outcomes. Humans stake on outcomes, evidence is organised transparently in Supabase, GenLayer reasons over the evidence through validator LLM consensus, and the same GenLayer Intelligent Contract records parimutuel pools, payout entitlements, refund entitlements, and claims. No OpenAI, external AI API, or Solidity escrow contract is used in the MVP.

---

## Core Idea

Prediction markets work when the settlement mechanism is trustworthy and transparent. Traditional prediction markets use oracles or centralised judges. GenSeer uses GenLayer — a blockchain whose validators run LLM consensus to reason over supplied evidence and return a verifiable on-chain verdict.

The GenSeer architecture has three layers:

| Layer | Role |
|---|---|
| **Supabase** | Organises evidence, mirrors market metadata, indexes activity |
| **GenLayer** | Judges the evidence, records stakes/pools, calculates payouts/refunds |
| **Frontend** | Displays data, triggers user actions, previews calculations |

**Supabase does not decide winners. Frontend does not decide winners. Pool sizes show market belief, not truth. GenLayer decides truth.**

---

## No OpenAI Explanation

GenSeer does not call OpenAI, Claude, Anthropic, or any external AI API. Settlement reasoning is performed by GenLayer's validator LLM consensus — multiple independent validators run LLM inference and reach consensus via the GenLayer protocol. This is fundamentally different from a centralised AI API call. The reasoning is part of the on-chain transaction.

---

## No Solidity Escrow Explanation

GenSeer does not use a Solidity escrow contract for the MVP. All market creation, stake recording, pool accounting, payout entitlement calculation, refund entitlement calculation, and claim recording happens in one GenLayer Intelligent Contract (`contracts/genlayer/genseer_market.py`). For testnet/Studionet purposes, stakes are recorded as accounting units in the GenLayer contract.

---

## GenLayer-Native Accounting Explanation

The `GenSeerMarket` contract:
- Creates and stores official market state
- Records all stakes by outcome and by user
- Maintains outcome pools and total pool
- Validates liquidity before settlement
- Performs subjective reasoning via `gl.get_webpage()` (GenLayer's LLM call mechanism)
- Calculates payout entitlements using the parimutuel formula
- Calculates full refunds for invalid/cancelled markets
- Records claim state — each user can only claim once

---

## Architecture

```
Frontend (Next.js App Router)
  │
  ├── /api/markets/create      → Supabase + GenLayer create_market()
  ├── /api/stake/record        → Supabase mirror + GenLayer stake()
  ├── /api/evidence/submit     → Supabase evidence_items
  ├── /api/evidence/challenge  → Supabase evidence_challenges
  ├── /api/settlement/prepare  → Build packet (no AI) + GenLayer settle_market()
  ├── /api/settlement/sync     → Read GenLayer verdict → Supabase settlements
  └── /api/reputation/update   → Update user scores in Supabase

Supabase (Postgres)
  ├── users, markets, outcomes
  ├── stakes, evidence_items, evidence_challenges
  ├── settlement_packets, settlements, claims
  └── market_activity

GenLayer (Studionet)
  └── contracts/genlayer/genseer_market.py
        ├── create_market()
        ├── stake()
        ├── close_market()
        ├── open_evidence_phase()
        ├── settle_market()    ← LLM reasoning happens here
        ├── claim_payout()
        ├── claim_refund()
        └── cancel_market()
```

---

## Parimutuel Model

GenSeer is parimutuel — there are no fixed odds. Users stake into outcome pools. Pool-implied probability is:

```
outcome_pool / total_pool
```

If one outcome wins, payout formula:

```
platform_fee      = total_pool × platform_fee_bps / 10000
distributable     = total_pool - platform_fee
user_payout       = (user_stake_in_winning_pool / total_winning_pool) × distributable
```

**Example:**
- Total pool = 10,000 units
- Platform fee = 5% = 500 units
- Distributable = 9,500 units
- Winning pool = 5,500 units
- User stake in winning pool = 550 units (10%)
- User payout entitlement = 950 units

---

## Refund / No Contest Rules

A market is marked invalid (full refund, no platform fee) if:
- Only one outcome has stake
- Total pool below minimum (default: 100 units)
- Second-largest pool ratio is below minimum (default: 10% / 1000 bps)
- GenLayer verdict is `inconclusive` or `invalid`
- Evidence is insufficient
- Parsing/reasoning fails

---

## Market Statuses

| Status | Meaning |
|---|---|
| `draft` | Created in Supabase, not yet on GenLayer |
| `open` | Staking active |
| `closed` | Staking stopped |
| `evidence_phase` | Evidence submission window |
| `settlement_pending` | Submitted to GenLayer |
| `settled` | Verdict returned, payouts available |
| `invalid` | Refunds available |
| `refunded` | All refunds claimed |
| `cancelled` | Cancelled before settlement |
| `disputed` | Challenge under review |

---

## MVP Categories

| Category | Description |
|---|---|
| `crypto_launch` | Did a project launch create real adoption? |
| `creator_influence` | Did a creator move the needle on a project? |
| `community_sentiment` | How did community respond to an announcement? |

---

## Full Market Flow

1. **Create** — User defines title, outcomes, criteria, dates → Supabase + GenLayer
2. **Stake** — Users record testnet stakes → GenLayer records pools, Supabase mirrors
3. **Close** — Staking ends at `close_at` → market transitions to `closed`
4. **Evidence** — Users submit evidence URLs → Supabase stores; others challenge
5. **Prepare Packet** — Backend builds structured packet from evidence (no AI)
6. **GenLayer Settlement** — Packet sent to contract → validator LLM reasons → verdict
7. **Sync** — Verdict synced from GenLayer into Supabase `settlements` table
8. **Claim** — Winners claim payout; everyone claims refund on invalid
9. **Reputation** — User scores updated based on prediction accuracy, evidence quality

---

## Environment Variables

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=         # Your Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=    # Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY=        # Supabase service role (server only, never exposed)

# GenLayer
NEXT_PUBLIC_GENLAYER_RPC_URL=     # GenLayer Studionet RPC endpoint
NEXT_PUBLIC_GENSEER_MARKET_CONTRACT= # Deployed GenSeerMarket contract address
```

**Never add:** `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `NEXT_PUBLIC_ESCROW_CONTRACT_ADDRESS`, `PRIVATE_SETTLEMENT_OPERATOR_KEY`

---

## Supabase Setup

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Go to **SQL Editor** and run `supabase/schema.sql`
3. Optionally run `supabase/seed.sql` for demo data
4. Copy your project URL, anon key, and service role key into `.env.local`

---

## GenLayer Contract Setup

1. Install GenLayer Studionet: follow [GenLayer docs](https://docs.genlayer.com)
2. The contract is at `contracts/genlayer/genseer_market.py`
3. The contract header pins the exact py-genlayer dependency:
   ```python
   # v0.2.16
   # { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }
   ```
4. Deploy via GenLayer Studionet Studio or CLI
5. Copy the deployed contract address into `NEXT_PUBLIC_GENSEER_MARKET_CONTRACT`

---

## How to Run Locally

```bash
# 1. Clone / navigate to project
cd C:/Genseer

# 2. Install dependencies
npm install

# 3. Copy env file and fill in values
cp .env.example .env.local
# Edit .env.local with your Supabase and GenLayer values

# 4. Run database migrations
# (Run supabase/schema.sql in your Supabase SQL editor)

# 5. Start development server
npm run dev

# 6. Open http://localhost:3000

# Type checking
npm run typecheck

# Build
npm run build
```

---

## How Frontend Calls Backend

All user actions go through Next.js API routes (not directly to Supabase or GenLayer):

```
User action → React component → fetch('/api/...') → API route handler
  → createAdminClient() [Supabase] + GenLayer wrapper → response
```

The Supabase service role key is **never** sent to the browser. API routes use `lib/supabase/admin.ts`.

---

## How Backend Prepares Settlement Packet

`POST /api/settlement/prepare`:
1. Loads market, outcomes, evidence, challenges from Supabase
2. Calculates pool summary
3. Calls `buildSettlementPacket()` — pure data formatting, **no AI**
4. Stores packet in `settlement_packets` table
5. Passes packet to `settleMarketOnGenLayer()` which calls `settle_market()` on the contract

---

## How GenLayer Settlement Works

Inside `settle_market()` in the GenLayer contract:
1. Validates liquidity (total pool, funded outcomes, opposing ratio)
2. If liquidity invalid → marks market invalid immediately
3. Builds a structured prompt from evidence, challenges, pools, and settlement criteria
4. Calls `gl.get_webpage(prompt, mode="text")` — GenLayer's mechanism for LLM consensus
5. Multiple validators run inference independently and reach consensus
6. `_safe_parse_ruling()` extracts the JSON verdict
7. If verdict is `settled` → records winning outcome
8. If verdict is `inconclusive` or `invalid` → marks market invalid, refund recommended

---

## How GenLayer Accounting Works

The contract stores all state in `TreeMap` storage:
- `markets` — market JSON keyed by market_id
- `stakes` — stake history keyed by market_id
- `user_market_stakes` — per-user stake map keyed by `market_id:user_address`
- `settlements` — verdict JSON keyed by market_id
- `claims` — claim records keyed by `market_id:user_address`

Payout and refund are calculated inside the contract using the parimutuel formula. No platform fee is taken from refunded markets.

---

## How GenLayer Payout/Refund Entitlements Work

**Payout (settled market):**
```python
platform_fee  = total_pool * platform_fee_bps // 10000
distributable = total_pool - platform_fee
user_payout   = user_stake_in_winning_pool * distributable // total_winning_pool
```

**Refund (invalid/cancelled market):**
```python
user_refund = user_total_staked  # 100% back, no fee
```

Claims are one-time: once `claimed=True` is set in `user_market_stakes`, the user cannot claim again.

---

## Known Limitations

- Wallet connection is currently a placeholder (`0xdemo_user_wallet`) — integrate MetaMask or WalletConnect for production
- GenLayer RPC adapter in `lib/genlayer/client.ts` uses a JSON-RPC stub — wire to the actual Studionet JS SDK once available
- Real value transfer depends on the GenLayer/Studionet environment supporting it; for testnet this is accounting-unit only
- No pagination on market list (capped at 50)
- No real-time updates (no Supabase realtime subscriptions yet)

---

## Next Steps

- [ ] Wire real wallet (MetaMask / WalletConnect)
- [ ] Integrate official GenLayer JS SDK / Studionet client
- [ ] Add Supabase realtime for live pool updates
- [ ] Add market activity feed to market detail page
- [ ] Add pagination to market list
- [ ] Add user claim history to profile page
- [ ] Add admin panel for market lifecycle transitions
- [ ] Add market cancellation UI
- [ ] Add reputation leaderboard
- [ ] Mobile-responsive polish
