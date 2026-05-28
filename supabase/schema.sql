create extension if not exists "uuid-ossp";

create table users (
  id uuid primary key default uuid_generate_v4(),
  wallet_address text unique not null,
  username text,
  avatar_url text,
  reputation_score int default 0,
  prediction_accuracy int default 0,
  evidence_score int default 0,
  challenge_score int default 0,
  creator_score int default 0,
  created_at timestamptz default now()
);

create table markets (
  id uuid primary key default uuid_generate_v4(),
  genlayer_market_id text unique,
  creator_id uuid references users(id),
  title text not null,
  description text not null,
  category text not null check (
    category in ('crypto_launch', 'creator_influence', 'community_sentiment')
  ),
  status text default 'draft',
  close_at timestamptz not null,
  evidence_ends_at timestamptz not null,
  settlement_at timestamptz not null,
  settlement_criteria text not null,
  approved_sources jsonb default '[]',
  minimum_total_pool numeric default 100,
  minimum_opposing_ratio numeric default 0.10,
  platform_fee_bps int default 500,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table outcomes (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id) on delete cascade,
  outcome_index int not null,
  label text not null,
  description text,
  total_staked numeric default 0,
  unique(market_id, outcome_index)
);

create table stakes (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id) on delete cascade,
  outcome_index int not null,
  user_id uuid references users(id),
  wallet_address text not null,
  amount numeric not null,
  genlayer_tx_hash text,
  created_at timestamptz default now()
);

create table evidence_items (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id) on delete cascade,
  submitted_by uuid references users(id),
  source_url text not null,
  source_type text not null,
  title text,
  description text not null,
  supports_outcome_index int,
  status text default 'submitted',
  quality_score int default 0,
  created_at timestamptz default now()
);

create table evidence_challenges (
  id uuid primary key default uuid_generate_v4(),
  evidence_id uuid references evidence_items(id) on delete cascade,
  market_id uuid references markets(id) on delete cascade,
  challenger_id uuid references users(id),
  reason text not null,
  details text not null,
  status text default 'pending',
  created_at timestamptz default now(),
  resolved_at timestamptz
);

create table settlement_packets (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id) on delete cascade,
  packet jsonb not null,
  status text default 'prepared',
  created_at timestamptz default now()
);

create table settlements (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id) on delete cascade,
  genlayer_settlement_id text unique,
  winning_outcome_index int,
  winning_outcome_label text,
  verdict text not null,
  confidence int default 0,
  evidence_strength text,
  sentiment_analysis text,
  metrics_analysis text,
  sceptic_analysis text,
  context_analysis text,
  reasoning text not null,
  evidence_summary text not null,
  counterarguments text,
  refund_recommended boolean default false,
  genlayer_tx_hash text,
  created_at timestamptz default now()
);

create table claims (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id),
  user_id uuid references users(id),
  wallet_address text not null,
  claim_type text check (claim_type in ('payout', 'refund')),
  amount numeric not null,
  genlayer_tx_hash text,
  status text default 'pending',
  created_at timestamptz default now()
);

create table market_activity (
  id uuid primary key default uuid_generate_v4(),
  market_id uuid references markets(id),
  user_id uuid references users(id),
  activity_type text not null,
  description text not null,
  metadata jsonb default '{}',
  created_at timestamptz default now()
);

-- indexes for performance
create index idx_markets_status on markets(status);
create index idx_markets_category on markets(category);
create index idx_markets_creator on markets(creator_id);
create index idx_stakes_market on stakes(market_id);
create index idx_stakes_user on stakes(user_id);
create index idx_evidence_market on evidence_items(market_id);
create index idx_challenges_evidence on evidence_challenges(evidence_id);
create index idx_activity_market on market_activity(market_id);

-- RLS policies
alter table users enable row level security;
alter table markets enable row level security;
alter table outcomes enable row level security;
alter table stakes enable row level security;
alter table evidence_items enable row level security;
alter table evidence_challenges enable row level security;
alter table settlement_packets enable row level security;
alter table settlements enable row level security;
alter table claims enable row level security;
alter table market_activity enable row level security;

-- Public read for most tables
create policy "Public read markets" on markets for select using (true);
create policy "Public read outcomes" on outcomes for select using (true);
create policy "Public read stakes" on stakes for select using (true);
create policy "Public read evidence" on evidence_items for select using (true);
create policy "Public read challenges" on evidence_challenges for select using (true);
create policy "Public read settlements" on settlements for select using (true);
create policy "Public read activity" on market_activity for select using (true);
create policy "Public read users" on users for select using (true);

-- Service role gets full access (enforced server-side)
create policy "Service role full access markets" on markets for all using (true);
create policy "Service role full access outcomes" on outcomes for all using (true);
create policy "Service role full access stakes" on stakes for all using (true);
create policy "Service role full access evidence" on evidence_items for all using (true);
create policy "Service role full access challenges" on evidence_challenges for all using (true);
create policy "Service role full access packets" on settlement_packets for all using (true);
create policy "Service role full access settlements" on settlements for all using (true);
create policy "Service role full access claims" on claims for all using (true);
create policy "Service role full access activity" on market_activity for all using (true);
create policy "Service role full access users" on users for all using (true);
