// ---------------------------------------------------------------------------
// Supabase Client — Frontend data source for public staking analytics
// ---------------------------------------------------------------------------

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function isSupabaseAvailable(): boolean {
  return !!supabase;
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DbStake {
  id: number;
  stake_id: string;
  wallet: string;
  token: string;
  amount: string;
  snapshot_value: string;
  reward: string;
  pool_id: string;
  status: number;
  created_at: string;
  unlock_time: string | null;
}

export interface DbClaim {
  id: number;
  wallet: string;
  stake_id: string;
  reward: string;
  claimed_at: string;
}

export interface DbProtocolStats {
  id: number;
  total_stakes: number;
  active_stakers: number;
  coverage: number;
  reserved_rewards: string;
  treasury_balance: string;
  updated_at: string;
}

export interface TopToken {
  token: string;
  total_stakes: number;
  unique_stakers: number;
  total_snapshot_value: string;
}

export interface TopStaker {
  wallet: string;
  stake_count: number;
  total_value: string;
  pending_rewards: string;
}

// ---------------------------------------------------------------------------
// Queries
// ---------------------------------------------------------------------------

export async function fetchRecentStakes(limit = 20): Promise<DbStake[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("stakes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[supabase] recent stakes:", error);
  return data || [];
}

export async function fetchRecentClaims(limit = 20): Promise<DbClaim[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("claims")
    .select("*")
    .order("claimed_at", { ascending: false })
    .limit(limit);
  if (error) console.error("[supabase] recent claims:", error);
  return data || [];
}

export async function fetchProtocolStats(): Promise<DbProtocolStats | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("protocol_stats")
    .select("*")
    .eq("id", 1)
    .single();
  if (error) console.error("[supabase] protocol stats:", error);
  return data || null;
}

export async function fetchTopTokens(limit = 10): Promise<TopToken[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("top_staked_tokens")
    .select("*")
    .limit(limit);
  if (error) console.error("[supabase] top tokens:", error);
  return data || [];
}

export async function fetchTopStakers(limit = 10): Promise<TopStaker[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("top_stakers")
    .select("*")
    .limit(limit);
  if (error) console.error("[supabase] top stakers:", error);
  return data || [];
}

export async function fetchActiveStakersCount(): Promise<number> {
  if (!supabase) return 0;
  const { count, error } = await supabase
    .from("stakes")
    .select("wallet", { count: "exact", head: true })
    .eq("status", 0);
  if (error) console.error("[supabase] active stakers:", error);
  return count || 0;
}
