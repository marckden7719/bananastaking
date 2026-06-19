-- ---------------------------------------------------------------------------
-- Supabase Schema for James Universal Staking V3 Indexer
-- ---------------------------------------------------------------------------

-- Stakes table: stores all staked positions
CREATE TABLE IF NOT EXISTS stakes (
  id BIGSERIAL PRIMARY KEY,
  stake_id NUMERIC(78, 0) NOT NULL UNIQUE,
  wallet TEXT NOT NULL,
  token TEXT NOT NULL,
  amount NUMERIC(78, 0) NOT NULL,
  snapshot_value NUMERIC(78, 0) NOT NULL DEFAULT 0,
  reward NUMERIC(78, 0) NOT NULL DEFAULT 0,
  pool_id NUMERIC(78, 0) NOT NULL DEFAULT 0,
  status SMALLINT NOT NULL DEFAULT 0,
  block_number BIGINT,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  unlock_time TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Claims table: stores all claimed rewards
CREATE TABLE IF NOT EXISTS claims (
  id BIGSERIAL PRIMARY KEY,
  wallet TEXT NOT NULL,
  stake_id NUMERIC(78, 0) NOT NULL,
  reward NUMERIC(78, 0) NOT NULL,
  block_number BIGINT,
  tx_hash TEXT,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Protocol stats: aggregated dashboard data
CREATE TABLE IF NOT EXISTS protocol_stats (
  id SERIAL PRIMARY KEY,
  total_stakes BIGINT NOT NULL DEFAULT 0,
  active_stakers BIGINT NOT NULL DEFAULT 0,
  coverage NUMERIC(10, 2) NOT NULL DEFAULT 0,
  reserved_rewards NUMERIC(78, 0) NOT NULL DEFAULT 0,
  treasury_balance NUMERIC(78, 0) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_stakes_wallet ON stakes (wallet);
CREATE INDEX IF NOT EXISTS idx_stakes_token ON stakes (token);
CREATE INDEX IF NOT EXISTS idx_stakes_status ON stakes (status);
CREATE INDEX IF NOT EXISTS idx_stakes_created_at ON stakes (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_claims_wallet ON claims (wallet);
CREATE INDEX IF NOT EXISTS idx_claims_claimed_at ON claims (claimed_at DESC);

-- Materialized view: top staked tokens
CREATE MATERIALIZED VIEW IF NOT EXISTS top_staked_tokens AS
SELECT
  token,
  COUNT(*) AS total_stakes,
  COUNT(DISTINCT wallet) AS unique_stakers,
  SUM(snapshot_value) AS total_snapshot_value
FROM stakes
WHERE status = 0
GROUP BY token
ORDER BY total_snapshot_value DESC;

-- Materialized view: top stakers leaderboard
CREATE MATERIALIZED VIEW IF NOT EXISTS top_stakers AS
SELECT
  wallet,
  COUNT(*) AS stake_count,
  SUM(snapshot_value) AS total_value,
  SUM(reward) AS pending_rewards
FROM stakes
WHERE status = 0
GROUP BY wallet
ORDER BY total_value DESC;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_staking_views()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_staked_tokens;
  REFRESH MATERIALIZED VIEW CONCURRENTLY top_stakers;
END;
$$ LANGUAGE plpgsql;

-- RPC: get top staked tokens (for frontend)
CREATE OR REPLACE FUNCTION get_top_staked_tokens(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  token TEXT,
  total_stakes BIGINT,
  unique_stakers BIGINT,
  total_snapshot_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    t.token,
    t.total_stakes,
    t.unique_stakers,
    t.total_snapshot_value
  FROM top_staked_tokens t
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RPC: get top stakers (for frontend)
CREATE OR REPLACE FUNCTION get_top_stakers(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  wallet TEXT,
  stake_count BIGINT,
  total_value NUMERIC,
  pending_rewards NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.wallet,
    s.stake_count,
    s.total_value,
    s.pending_rewards
  FROM top_stakers s
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RPC: get recent stakes feed (public)
CREATE OR REPLACE FUNCTION get_recent_stakes(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  stake_id NUMERIC,
  wallet TEXT,
  token TEXT,
  amount NUMERIC,
  pool_id NUMERIC,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.stake_id,
    s.wallet,
    s.token,
    s.amount,
    s.pool_id,
    s.created_at
  FROM stakes s
  ORDER BY s.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- RPC: get recent claims feed (public)
CREATE OR REPLACE FUNCTION get_recent_claims(limit_count INTEGER DEFAULT 20)
RETURNS TABLE (
  wallet TEXT,
  stake_id NUMERIC,
  reward NUMERIC,
  claimed_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.wallet,
    c.stake_id,
    c.reward,
    c.claimed_at
  FROM claims c
  ORDER BY c.claimed_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;
