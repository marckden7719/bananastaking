// ---------------------------------------------------------------------------
// Token Discovery Service — metadata fetching with caching
// ---------------------------------------------------------------------------

export interface TokenMetadata {
  address: string;
  name: string;
  symbol: string;
  decimals: number;
  logo: string | null;
}

const CACHE_PREFIX = "jb_token_meta_";
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

interface CachedToken {
  data: TokenMetadata;
  timestamp: number;
}

function getCached(address: string): TokenMetadata | null {
  try {
    const key = CACHE_PREFIX + address.toLowerCase();
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const cached: CachedToken = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(key);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCached(meta: TokenMetadata): void {
  try {
    const key = CACHE_PREFIX + meta.address.toLowerCase();
    const cached: CachedToken = { data: meta, timestamp: Date.now() };
    localStorage.setItem(key, JSON.stringify(cached));
  } catch {
    // storage full or unavailable
  }
}

function fallbackLogo(address: string): string {
  // Generate a deterministic identicon-like URL from address
  const seed = address.slice(2, 10);
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${seed}&backgroundColor=ffd54a`;
}

/**
 * Fetch token metadata with multi-source fallback.
 * Priority: Cache -> TrustWallet -> CoinGecko -> DexScreener -> On-chain only
 */
export async function fetchTokenMetadata(
  address: string,
  onChainDecimals?: number,
  onChainSymbol?: string,
  onChainName?: string
): Promise<TokenMetadata> {
  // 1. Check cache first
  const cached = getCached(address);
  if (cached) return cached;

  let name = onChainName || "Unknown Token";
  let symbol = onChainSymbol || "???";
  let decimals = onChainDecimals ?? 18;
  let logo: string | null = null;

  // 2. Try TrustWallet Assets
  try {
    const trustUrl = `https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/${address}/logo.png`;
    const resp = await fetch(trustUrl, { method: "HEAD", signal: AbortSignal.timeout(3000) });
    if (resp.ok) {
      logo = trustUrl;
    }
  } catch {
    // TrustWallet not available
  }

  // 3. Try DexScreener for metadata + logo
  try {
    const dexResp = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${address}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (dexResp.ok) {
      const dexData = await dexResp.json();
      if (dexData.pairs && dexData.pairs.length > 0) {
        const pair = dexData.pairs[0];
        if (pair.baseToken) {
          if (pair.baseToken.name) name = pair.baseToken.name;
          if (pair.baseToken.symbol) symbol = pair.baseToken.symbol;
        }
        if (pair.info?.imageUrl) {
          logo = pair.info.imageUrl;
        }
      }
    }
  } catch {
    // DexScreener not available
  }

  // 4. If still no logo, use fallback
  if (!logo) {
    logo = fallbackLogo(address);
  }

  const meta: TokenMetadata = {
    address: address.toLowerCase(),
    name,
    symbol,
    decimals,
    logo,
  };

  setCached(meta);
  return meta;
}

/**
 * Batch fetch metadata for multiple token addresses.
 * Returns a Map of address -> TokenMetadata.
 */
export async function batchFetchTokenMetadata(
  addresses: string[],
  tokenInfoMap: Map<string, { decimals?: number; symbol?: string; name?: string }>
): Promise<Map<string, TokenMetadata>> {
  const results = new Map<string, TokenMetadata>();
  const uniqueAddresses = [...new Set(addresses.map((a) => a.toLowerCase()))];

  await Promise.all(
    uniqueAddresses.map(async (addr) => {
      const info = tokenInfoMap.get(addr) || {};
      const meta = await fetchTokenMetadata(
        addr,
        info.decimals,
        info.symbol,
        info.name
      );
      results.set(addr, meta);
    })
  );

  return results;
}
