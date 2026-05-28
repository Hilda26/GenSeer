-- Seed demo users
insert into users (wallet_address, username, reputation_score, prediction_accuracy, evidence_score, creator_score)
values
  ('0xdemo1111111111111111111111111111111111111', 'AlphaTrader', 850, 72, 88, 91),
  ('0xdemo2222222222222222222222222222222222222', 'ChainWatcher', 620, 58, 75, 65),
  ('0xdemo3333333333333333333333333333333333333', 'GenSeer_dev', 1200, 81, 94, 97)
on conflict (wallet_address) do nothing;

-- Seed demo markets (draft state - not yet on GenLayer)
with u as (select id from users where wallet_address = '0xdemo3333333333333333333333333333333333333' limit 1)
insert into markets (
  genlayer_market_id, creator_id, title, description, category, status,
  close_at, evidence_ends_at, settlement_at, settlement_criteria,
  approved_sources, minimum_total_pool, platform_fee_bps
)
select
  'demo_market_001',
  u.id,
  'Did Project X launch create meaningful adoption?',
  'Assess whether the Project X mainnet launch generated real developer adoption, meaningful TVL growth, and credible community engagement in the 30 days post-launch.',
  'crypto_launch',
  'open',
  now() + interval '7 days',
  now() + interval '10 days',
  now() + interval '14 days',
  'Judge adoption based on verifiable metrics: TVL growth above $5M, active developer integrations on official registry, community traction from credible non-promotional sources, and evidence quality. Discount hype and unverified claims.',
  '["official blog", "dune analytics", "defillama", "github", "credible crypto news"]',
  100,
  500
from u;

-- Seed outcomes for demo market
with m as (select id from markets where genlayer_market_id = 'demo_market_001' limit 1)
insert into outcomes (market_id, outcome_index, label, total_staked)
select m.id, 0, 'Strong adoption', 550 from m
union all select m.id, 1, 'Moderate adoption', 300 from m
union all select m.id, 2, 'Weak adoption', 100 from m
union all select m.id, 3, 'Failed launch', 50 from m;

-- Seed market activity
with m as (select id from markets where genlayer_market_id = 'demo_market_001' limit 1),
     u as (select id from users where wallet_address = '0xdemo3333333333333333333333333333333333333' limit 1)
insert into market_activity (market_id, user_id, activity_type, description, metadata)
select m.id, u.id, 'market_created', 'Market created and opened for staking', '{"genlayer_market_id": "demo_market_001"}' from m, u;
