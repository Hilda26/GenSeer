-- Migration 002: Add comments and notifications tables
-- Run this once in your Supabase SQL Editor at:
-- https://supabase.com/dashboard/project/dglieiidcrhtwdnxzilw/sql

-- ─── Comments ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  market_id      UUID        NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
  wallet_address TEXT        NOT NULL,
  username       TEXT,
  text           TEXT        NOT NULL CHECK (char_length(text) BETWEEN 1 AND 500),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comments_market_id_idx ON comments(market_id);
CREATE INDEX IF NOT EXISTS comments_wallet_idx    ON comments(wallet_address);

-- ─── Notifications ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address TEXT        NOT NULL,
  market_id      UUID        REFERENCES markets(id) ON DELETE CASCADE,
  type           TEXT        NOT NULL,  -- 'market_settled' | 'evidence_challenged' | 'verdict_synced'
  message        TEXT        NOT NULL,
  read           BOOLEAN     NOT NULL DEFAULT false,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_wallet_idx  ON notifications(wallet_address);
CREATE INDEX IF NOT EXISTS notifications_read_idx    ON notifications(wallet_address, read);
