import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "./api";

export const EXCHANGE_INDEX_SYMBOLS = [
  "NIFTY",
  "BANKNIFTY",
  "SENSEX",
  "FINNIFTY",
  "MIDCPNIFTY",
  "BANKEX",
  "NIFTYNEXT50",
  "INDIAVIX",
];

export const DEFAULT_OPTION_SYMBOLS = [
  "NIFTY25450CE",
  "NIFTY25450PE",
  "BANKNIFTY62400CE",
  "BANKNIFTY62400PE",
  "SENSEX82600CE",
  "SENSEX82600PE",
];

export const DEFAULT_MARKET_SYMBOLS = [
  "NIFTY",
  "BANKNIFTY",
  "SENSEX",
  "FINNIFTY",
  "MIDCPNIFTY",
  "BANKEX",
  "NIFTYNEXT50",
  "INDIAVIX",
  ...DEFAULT_OPTION_SYMBOLS,
  "RELIANCE",
  "HDFCBANK",
  "TCS",
  "INFY",
  "ICICIBANK",
  "SBIN",
  "TATAMOTORS",
  "ITC",
  "BHARTIARTL",
  "AXISBANK",
  "KOTAKBANK",
  "LT",
  "BAJFINANCE",
  "ADANIENT",
  "HAL",
  "BEL",
  "ETERNAL",
  "RELIANCE.BO",
  "TCS.BO",
  "HDFCBANK.BO",
  "INFY.BO",
  "SBIN.BO",
];

// Shared client-side market caches so route switches & multi-widget views render immediately without flicker.
const quoteMemCache = new Map(); // symbol -> { quote, ts }
const candleMemCache = new Map(); // `${symbol}:${tf}` -> { candles, quote, marketStatus, ts }
const inflightQuoteCalls = new Map(); // symbolKey -> Promise
const inflightCandleCalls = new Map(); // `${symbol}:${tf}` -> Promise
let lastMarketStatus = "CLOSED";

function getCachedQuotesForList(symbolList) {
  const out = [];
  for (const s of symbolList) {
    const entry = quoteMemCache.get(s);
    if (entry?.quote) out.push(entry.quote);
  }
  return out;
}

export function formatPrice(n, digits = 2) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return num.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatRupeePrice(n) {
  const num = Number(n);
  if (!Number.isFinite(num)) return "—";
  return `₹${formatPrice(num, 2)}`;
}

export function useLiveMarketQuotes(symbols = DEFAULT_MARKET_SYMBOLS, options = {}) {
  const { pollMs = 5000, enabled = true } = options;
  const symbolList = useMemo(
    () =>
      Array.isArray(symbols)
        ? symbols
            .map((s) =>
              String(s || "")
                .trim()
                .toUpperCase(),
            )
            .filter(Boolean)
        : String(symbols || "")
            .split(",")
            .map((s) => s.trim().toUpperCase())
            .filter(Boolean),
    [symbols],
  );
  const symbolKey = symbolList.join(",");

  const [quotes, setQuotes] = useState(() => getCachedQuotesForList(symbolList));
  const [marketStatus, setMarketStatus] = useState(() => lastMarketStatus);
  const [fetchedAt, setFetchedAt] = useState(null);
  const [loading, setLoading] = useState(() => getCachedQuotesForList(symbolList).length === 0);
  const [error, setError] = useState(null);
  const [flashMap, setFlashMap] = useState({});
  const prevLtpRef = useRef({});
  const flashTimersRef = useRef({});

  useEffect(() => {
    const cached = getCachedQuotesForList(symbolList);
    if (cached.length) {
      setQuotes(cached);
      setLoading(false);
    }
  }, [symbolKey, symbolList]);

  const fetchQuotes = useCallback(async () => {
    if (!enabled) return;
    try {
      let reqPromise = inflightQuoteCalls.get(symbolKey);
      if (!reqPromise) {
        const params = symbolKey ? { symbols: symbolKey } : {};
        reqPromise = api
          .get("/market/quotes", { params })
          .then((res) => res.data)
          .finally(() => {
            inflightQuoteCalls.delete(symbolKey);
          });
        inflightQuoteCalls.set(symbolKey, reqPromise);
      }
      const data = await reqPromise;
      const list = data?.quotes || [];
      const now = Date.now();
      for (const q of list) {
        if (q?.symbol) quoteMemCache.set(q.symbol.toUpperCase(), { quote: q, ts: now });
      }
      if (data?.marketStatus) lastMarketStatus = data.marketStatus;

      const nextFlashes = {};
      for (const q of list) {
        const prev = prevLtpRef.current[q.symbol];
        if (prev != null && q.ltp !== prev) {
          nextFlashes[q.symbol] = q.ltp > prev ? "up" : "down";
        }
        prevLtpRef.current[q.symbol] = q.ltp;
      }
      if (Object.keys(nextFlashes).length) {
        setFlashMap((cur) => ({ ...cur, ...nextFlashes }));
        for (const sym of Object.keys(nextFlashes)) {
          if (flashTimersRef.current[sym]) clearTimeout(flashTimersRef.current[sym]);
          flashTimersRef.current[sym] = setTimeout(() => {
            setFlashMap((cur) => {
              if (!cur[sym]) return cur;
              const copy = { ...cur };
              delete copy[sym];
              return copy;
            });
          }, 700);
        }
      }
      setQuotes(list);
      if (data?.marketStatus) setMarketStatus(data.marketStatus);
      if (data?.fetchedAt) setFetchedAt(data.fetchedAt);
      setError(null);
    } catch (err) {
      setError(err?.message || "Market feed unavailable");
    } finally {
      setLoading(false);
    }
  }, [symbolKey, enabled]);

  useEffect(() => {
    if (!enabled) return;
    const allFresh =
      symbolList.length > 0 &&
      symbolList.every((s) => {
        const entry = quoteMemCache.get(s);
        const freshWindow = lastMarketStatus === "LIVE" ? 4000 : 45000;
        return entry && Date.now() - entry.ts < freshWindow;
      });
    if (!allFresh) {
      fetchQuotes();
    }
    const effectivePollMs =
      !pollMs || pollMs < 1000 ? 0 : marketStatus === "LIVE" ? pollMs : Math.max(pollMs, 60000);
    if (!effectivePollMs) return;
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) {
        fetchQuotes();
      }
    }, effectivePollMs);
    const onVisible = () => {
      if (!document.hidden) fetchQuotes();
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [fetchQuotes, pollMs, enabled, marketStatus, symbolList]);

  useEffect(() => {
    const timers = flashTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  const quoteMap = useMemo(() => {
    const map = {};
    for (const q of quotes) map[q.symbol] = q;
    return map;
  }, [quotes]);

  return {
    quotes,
    quoteMap,
    marketStatus,
    fetchedAt,
    loading,
    error,
    flashMap,
    refresh: fetchQuotes,
  };
}

const CLIENT_FALLBACK_SPOTS = {
  NIFTY: 25450,
  BANKNIFTY: 62350,
  SENSEX: 82600,
  FINNIFTY: 28280,
  MIDCPNIFTY: 17870,
  NIFTYNEXT50: 68500,
  BANKEX: 70170,
  INDIAVIX: 14.2,
  RELIANCE: 1345,
  HDFCBANK: 1750,
  TCS: 3800,
  INFY: 1850,
  ICICIBANK: 1300,
  SBIN: 810,
};

function hashStr(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function getStepSeconds(tf) {
  return tf === "1m" ? 60 : tf === "15m" ? 900 : tf === "1h" ? 3600 : tf === "1D" ? 86400 : 300;
}

function buildInstantClientCandles(symbol, tf) {
  const sym = String(symbol || "NIFTY").toUpperCase();
  const cachedQuote = quoteMemCache.get(sym)?.quote;
  const spot = Number(cachedQuote?.ltp) || CLIENT_FALLBACK_SPOTS[sym] || 1500;
  const prevClose = Number(cachedQuote?.prevClose) || +(spot * 0.996).toFixed(2);
  const count = 40;
  const stepSec = getStepSeconds(tf);
  const endSec = Math.floor(Date.now() / 1000);
  const seed = hashStr(`${sym}:${tf}`);
  const bars = [];
  let price = prevClose;
  for (let i = 0; i < count; i++) {
    const wave = Math.sin((i + (seed % 13)) * 0.45) * 0.002 + Math.cos((i + seed) * 0.25) * 0.0012;
    const open = +price.toFixed(2);
    const close = i === count - 1 ? +spot.toFixed(2) : +(open * (1 + wave)).toFixed(2);
    const spread = Math.max(0.5, open * 0.0016);
    bars.push({
      i,
      time: endSec - (count - 1 - i) * stepSec,
      open,
      high: +(Math.max(open, close) + spread * 0.6).toFixed(2),
      low: +(Math.min(open, close) - spread * 0.6).toFixed(2),
      close,
      volume: 12000 + ((seed + i * 7919) % 35000),
    });
    price = close;
  }
  return {
    candles: bars,
    quote: cachedQuote || {
      symbol: sym,
      ltp: spot,
      prevClose,
      change: +(spot - prevClose).toFixed(2),
      changePct: prevClose ? +(((spot - prevClose) / prevClose) * 100).toFixed(2) : 0,
      source: "Warm",
    },
  };
}

function prefetchCandleKey(symbol, tf) {
  if (!symbol || typeof window === "undefined") return;
  const sym = String(symbol).toUpperCase();
  const key = `${sym}:${tf}`;
  if (candleMemCache.has(key) || inflightCandleCalls.has(key)) return;
  const req = api
    .get("/market/candles", { params: { symbol: sym, tf } })
    .then((res) => {
      const data = res.data;
      const nextCandles = Array.isArray(data?.candles) ? data.candles : [];
      if (nextCandles.length || data?.quote) {
        candleMemCache.set(key, {
          candles: nextCandles,
          quote: data?.quote || null,
          marketStatus: data?.marketStatus || lastMarketStatus,
          ts: Date.now(),
        });
      }
      if (data?.quote?.symbol) {
        quoteMemCache.set(data.quote.symbol.toUpperCase(), { quote: data.quote, ts: Date.now() });
      }
    })
    .catch(() => {})
    .finally(() => {
      inflightCandleCalls.delete(key);
    });
  inflightCandleCalls.set(key, req);
}

let prefetchedDefaults = false;

export function useLiveCandles(symbol, tf = "5m", options = {}) {
  const { pollMs = 8000, enabled = true } = options;
  const cacheKey = `${String(symbol || "").toUpperCase()}:${tf}`;
  const cachedInit = candleMemCache.get(cacheKey);
  const initialData = cachedInit?.candles?.length
    ? cachedInit
    : buildInstantClientCandles(symbol, tf);

  const [candles, setCandles] = useState(() => initialData.candles || []);
  const [quote, setQuote] = useState(() => initialData.quote || null);
  const [marketStatus, setMarketStatus] = useState(
    () => cachedInit?.marketStatus || lastMarketStatus,
  );
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const entry = candleMemCache.get(cacheKey);
    if (entry?.candles?.length) {
      setCandles(entry.candles);
      if (entry.quote) setQuote(entry.quote);
      if (entry.marketStatus) setMarketStatus(entry.marketStatus);
      setLoading(false);
    } else if (symbol) {
      const instant = buildInstantClientCandles(symbol, tf);
      setCandles(instant.candles);
      if (instant.quote) setQuote(instant.quote);
      setLoading(false);
    }
  }, [cacheKey, symbol, tf]);

  const fetchCandles = useCallback(
    async (isBackground = false) => {
      if (!enabled || !symbol) return;
      if (!isBackground && !candleMemCache.get(cacheKey)?.candles?.length) {
        setRefreshing(true);
      }
      try {
        let reqPromise = inflightCandleCalls.get(cacheKey);
        if (!reqPromise) {
          reqPromise = api
            .get("/market/candles", { params: { symbol, tf } })
            .then((res) => res.data)
            .finally(() => {
              inflightCandleCalls.delete(cacheKey);
            });
          inflightCandleCalls.set(cacheKey, reqPromise);
        }
        const data = await reqPromise;
        const nextCandles = Array.isArray(data?.candles) ? data.candles : [];
        if (nextCandles.length) setCandles(nextCandles);
        if (data?.quote) {
          setQuote(data.quote);
          if (data.quote.symbol) {
            quoteMemCache.set(data.quote.symbol.toUpperCase(), {
              quote: data.quote,
              ts: Date.now(),
            });
          }
        }
        if (data?.marketStatus) {
          lastMarketStatus = data.marketStatus;
          setMarketStatus(data.marketStatus);
        }
        if (nextCandles.length || data?.quote) {
          candleMemCache.set(cacheKey, {
            candles: nextCandles,
            quote: data?.quote || null,
            marketStatus: data?.marketStatus || lastMarketStatus,
            ts: Date.now(),
          });
        }
        setError(null);
      } catch (err) {
        setError(err?.message || "Chart feed unavailable");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [symbol, tf, enabled, cacheKey],
  );

  useEffect(() => {
    if (!enabled || !symbol) return;
    const entry = candleMemCache.get(cacheKey);
    const freshWindow = lastMarketStatus === "LIVE" ? 5000 : 45000;
    if (!entry || Date.now() - entry.ts >= freshWindow) {
      fetchCandles(Boolean(entry));
    }

    // Quietly warm popular indices & adjacent timeframes so tab/TF switches are instant
    const timerPrefetch = setTimeout(() => {
      if (!prefetchedDefaults) {
        prefetchedDefaults = true;
        for (const s of ["NIFTY", "BANKNIFTY", "SENSEX", "FINNIFTY"]) {
          if (s !== String(symbol).toUpperCase()) prefetchCandleKey(s, "5m");
        }
      }
      if (tf !== "5m") prefetchCandleKey(symbol, "5m");
      if (tf !== "15m") prefetchCandleKey(symbol, "15m");
    }, 150);

    const effectivePollMs =
      !pollMs || pollMs < 1000 ? 0 : marketStatus === "LIVE" ? pollMs : Math.max(pollMs, 60000);
    if (!effectivePollMs) {
      return () => clearTimeout(timerPrefetch);
    }
    const id = setInterval(() => {
      if (typeof document === "undefined" || !document.hidden) {
        fetchCandles(true);
      }
    }, effectivePollMs);
    const onVisible = () => {
      if (!document.hidden) fetchCandles(true);
    };
    if (typeof document !== "undefined") {
      document.addEventListener("visibilitychange", onVisible);
    }
    return () => {
      clearTimeout(timerPrefetch);
      clearInterval(id);
      if (typeof document !== "undefined") {
        document.removeEventListener("visibilitychange", onVisible);
      }
    };
  }, [fetchCandles, pollMs, enabled, symbol, tf, marketStatus, cacheKey]);

  return {
    candles,
    quote,
    marketStatus,
    loading,
    refreshing,
    error,
    refresh: () => fetchCandles(false),
  };
}

export async function searchMarketSymbols(query) {
  const res = await api.get("/market/search", { params: { q: query || "" } });
  return res.data || [];
}
