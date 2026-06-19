// ---------------------------------------------------------------------------
// James Universal Staking V3 — Event Indexer (Node.js)
//
// Architecture:
//   Smart Contract Events -> Node.js Indexer -> Supabase -> Frontend
//
// Usage:
//   cd node index.js
//
// Environment variables:
//   SUPABASE_URL         — Supabase project URL
//   SUPABASE_SERVICE_KEY — Supabase service role key
//   RPC_URL              — Monad RPC endpoint
//   CONTRACT_ADDRESS     — Staking contract address
//   START_BLOCK          — Block to start from
// ---------------------------------------------------------------------------

const { createPublicClient, http, parseAbiItem } = require("viem");

// Monad chain definition (inline to avoid TS)
const monadMainnet = {
  id: 143,
  name: "Monad",
  nativeCurrency: { name: "Monad", symbol: "MON", decimals: 18 },
  rpcUrls: {
    default: { http: [process.env.RPC_URL || "https://rpc.monad.xyz"] },
  },
};

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS ||
  "0x3C81F9883B852Af0e489D7924CC4CC3A3aB2a911";
const START_BLOCK = BigInt(process.env.START_BLOCK || "0");
const POLL_INTERVAL_MS = 15000;
const BATCH_SIZE = 5000;

// Supabase REST helper
async function sbReq(method, path, body) {
  const url = `${SUPABASE_URL}/rest/v1/${path}`;
  const headers = {
    apikey: SUPABASE_SERVICE_KEY,
    Authorization: `Bearer ${SUPABASE_SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
  if (method === "GET") delete headers["Content-Type"];
  const resp = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!resp.ok && resp.status !== 409) {
    console.error(`[indexer] Supabase ${resp.status}: ${await resp.text()}`);
  }
  if (resp.status === 204 || resp.status === 201) return null;
  return resp.json();
}

// Viem client
const client = createPublicClient({
  chain: monadMainnet,
  transport: http(process.env.RPC_URL || "https://rpc.monad.xyz", { batch: true }),
});

// Event ABIs
const STAKED = parseAbiItem(
  "event Staked(address indexed user, uint256 indexed stakeId, address token, uint256 amount, uint256 poolId)"
);
const CLAIMED = parseAbiItem(
  "event Claimed(address indexed user, uint256 indexed stakeId, uint256 reward)"
);

let lastIndexedBlock = START_BLOCK;

async function indexBatch() {
  try {
    const latestBlock = await client.getBlockNumber();
    if (latestBlock <= lastIndexedBlock) return;

    const fromBlock = lastIndexedBlock + 1n;
    const toBlock = latestBlock < fromBlock + BigInt(BATCH_SIZE)
      ? latestBlock
      : fromBlock + BigInt(BATCH_SIZE) - 1n;

    console.log(`[indexer] Blocks ${fromBlock} → ${toBlock}`);

    const [stakeLogs, claimLogs] = await Promise.all([
      client.getLogs({ address: CONTRACT_ADDRESS, event: STAKED, fromBlock, toBlock }),
      client.getLogs({ address: CONTRACT_ADDRESS, event: CLAIMED, fromBlock, toBlock }),
    ]);

    if (stakeLogs.length > 0) {
      const rows = stakeLogs.map((log) => ({
        stake_id: String(log.args.stakeId),
        wallet: log.args.user.toLowerCase(),
        token: log.args.token.toLowerCase(),
        amount: String(log.args.amount),
        pool_id: String(log.args.poolId),
        snapshot_value: "0",
        reward: "0",
        status: 0,
        block_number: Number(log.blockNumber),
        tx_hash: log.transactionHash,
        created_at: new Date().toISOString(),
      }));
      await sbReq("POST", "stakes?on_conflict=do_nothing", rows);
      console.log(`[indexer] +${rows.length} stakes`);
    }

    if (claimLogs.length > 0) {
      const rows = claimLogs.map((log) => ({
        wallet: log.args.user.toLowerCase(),
        stake_id: String(log.args.stakeId),
        reward: String(log.args.reward),
        block_number: Number(log.blockNumber),
        tx_hash: log.transactionHash,
        claimed_at: new Date().toISOString(),
      }));
      await sbReq("POST", "claims?on_conflict=do_nothing", rows);

      for (const log of claimLogs) {
        await sbReq("PATCH", `stakes?stake_id=eq.${log.args.stakeId}`, {
          status: 2,
          updated_at: new Date().toISOString(),
        });
      }
      console.log(`[indexer] +${rows.length} claims`);
    }

    lastIndexedBlock = toBlock;
    console.log(`[indexer] Up to block ${lastIndexedBlock}`);
  } catch (err) {
    console.error("[indexer]", err);
  }
}

async function main() {
  console.log("James Universal Staking V3 Indexer");
  console.log(`Contract: ${CONTRACT_ADDRESS}`);
  console.log(`Supabase: ${SUPABASE_URL}`);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
    process.exit(1);
  }
  await indexBatch();
  setInterval(indexBatch, POLL_INTERVAL_MS);
}

main();
