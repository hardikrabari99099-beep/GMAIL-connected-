import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "@/lib/router-compat";
import { toast } from "sonner";
import { api, formatINR, formatApiError } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "../../components/ui/dialog";
import {
  DEFAULT_MARKET_SYMBOLS,
  EXCHANGE_INDEX_SYMBOLS,
  useLiveMarketQuotes,
  useLiveCandles,
  searchMarketSymbols,
  formatPrice,
} from "../../lib/useLiveMarket";
import { useTraderState } from "../../lib/useTraderState";
import { CandleChart } from "../../components/CandleChart";
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  CheckCircle2,
  Bell,
  ShieldAlert,
  TrendingUp,
  Target,
  CalendarDays,
  LifeBuoy,
  Send,
  Wallet,
  BadgeCheck,
  AlertTriangle,
  Activity,
  Search,
  RefreshCw,
  X,
  Radio,
  ArrowRight,
  Lock,
  Pencil,
  StickyNote,
} from "lucide-react";

const TIMEFRAMES = ["1m", "5m", "15m", "1h", "1D"];

/* ---------- shared bits ---------- */
export function LiveFeedBadge({ status }) {
  const isLive = status === "LIVE";
  return (
    <span className={`live-badge ${isLive ? "is-live" : "is-closed"}`}>
      <Radio size={11} /> {isLive ? "NSE/BSE Live" : "NSE/BSE Last Close"}
    </span>
  );
}

function PageHead({ title, sub, badge, children }) {
  return (
    <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
          {badge || null}
        </div>
        {sub && <p className="text-sm text-[var(--muted)] mt-2 max-w-2xl">{sub}</p>}
      </div>
      {children}
    </div>
  );
}

function NoAccountCta({ title = "No active funded account", message }) {
  return (
    <div className="card-panel p-10 text-center" data-testid="no-active-account-cta">
      <Lock size={26} className="text-[var(--accent)] mx-auto" />
      <div className="font-display text-2xl mt-4">{title}</div>
      <p className="text-sm text-[var(--muted)] mt-2 max-w-md mx-auto">
        {message ||
          "Your trading balance is ₹0. Purchase a challenge plan first to unlock trading capital, evaluation tracking, and live risk monitoring."}
      </p>
      <Link
        to="/challenges"
        className="btn-amber rounded-full px-6 py-3 text-sm mt-6 inline-flex items-center gap-2"
      >
        Go for a funded account <ArrowRight size={14} />
      </Link>
    </div>
  );
}

const inr = (n) => formatINR(Math.round(Number(n) || 0));
const signed = (n) => `${n >= 0 ? "+" : "−"}${inr(Math.abs(n))}`;
const pnlCls = (n) => (n >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]");

export function StatusPill({ status }) {
  const s = String(status || "").toLowerCase();
  const tone = [
    "active",
    "executed",
    "paid",
    "funded",
    "approved",
    "open",
    "verified",
    "resolved",
    "passed",
  ].includes(s)
    ? "ok"
    : ["pending", "processing", "submitted", "in review", "under review"].includes(s)
      ? "wait"
      : ["failed", "rejected", "cancelled", "breached"].includes(s)
        ? "bad"
        : "neutral";
  return <span className={`status-pill is-${tone}`}>{status}</span>;
}

function Table({ cols, rows, empty = "Nothing here yet." }) {
  return (
    <div className="card-panel overflow-x-auto">
      <table className="w-full text-sm min-w-[640px] dash-table tabular-nums">
        <thead>
          <tr>
            {cols.map((c) => (
              <th key={c.k} className={c.right ? "text-right" : "text-left"}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length ? (
            rows.map((r, i) => (
              <tr key={r.id || `${r.symbol || "row"}-${i}`}>
                {cols.map((c) => (
                  <td key={c.k} className={c.right ? "text-right" : ""}>
                    {c.render ? c.render(r) : r[c.k]}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan={cols.length} className="text-center text-[var(--muted)] py-10">
                {empty}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function Meter({ label, value, max, money = true, warnAt = 0.7, sub }) {
  const pct = Math.max(0, Math.min(100, (value / (max || 1)) * 100));
  const tone = pct >= 90 ? "bad" : pct >= warnAt * 100 ? "wait" : "ok";
  return (
    <div className="card-panel p-5 tabular-nums">
      <div className="flex justify-between text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono">
        <span>{label}</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="font-display text-2xl mt-2">
        {money ? inr(value) : value}{" "}
        <span className="text-sm text-[var(--muted)]">/ {money ? inr(max) : max}</span>
      </div>
      <div className={`meter is-${tone}`}>
        <i style={{ width: `${pct}%` }} />
      </div>
      {sub && <div className="text-xs text-[var(--muted)] mt-2">{sub}</div>}
    </div>
  );
}

function Kpi({ label, value, sub, icon: Icon, tone }) {
  return (
    <div className="card-panel p-5 tabular-nums">
      <div className="flex justify-between items-start">
        <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
          {label}
        </div>
        {Icon && <Icon size={16} className="text-[var(--accent)]" />}
      </div>
      <div className={`font-display text-2xl md:text-3xl mt-3 ${tone || ""}`}>{value}</div>
      {sub && <div className="text-xs text-[var(--muted-2)] mt-1">{sub}</div>}
    </div>
  );
}

export { CandleChart };

/* ---------- Trading terminal ---------- */
export function TradingTerminal({ embedded = false } = {}) {
  const [searchParams] = useSearchParams();
  const {
    authenticated,
    accounts,
    activeAccount,
    hasActiveAccount,
    evaluationRisk,
    orders: liveOrders,
    positions: livePositions,
    trades: liveTrades,
    submitting,
    selectAccount,
    placeOrder,
    closePosition,
    updateNote,
  } = useTraderState({ pollMs: 5000 });

  const [watchlistSymbols, setWatchlistSymbols] = useState(DEFAULT_MARKET_SYMBOLS);
  const [watchFilter, setWatchFilter] = useState("ALL");
  const [exchangeFilter, setExchangeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const paramSym = (searchParams.get("symbol") || "").trim().toUpperCase();
  const paramSide = (searchParams.get("side") || "").trim().toUpperCase();

  const [sym, setSym] = useState(paramSym || "NIFTY");
  const [tf, setTf] = useState("5m");
  const [chartMode, setChartMode] = useState("candle");
  const [showEma, setShowEma] = useState(true);
  const [side, setSide] = useState(paramSide === "SELL" ? "SELL" : "BUY");
  const [lots, setLots] = useState(1);
  const [note, setNote] = useState("");
  const [confirm, setConfirm] = useState(false);
  const [purchasePopup, setPurchasePopup] = useState(false);
  const [noteEditor, setNoteEditor] = useState(null);

  useEffect(() => {
    if (paramSym) {
      setSym(paramSym);
      setWatchlistSymbols((prev) => (prev.includes(paramSym) ? prev : [paramSym, ...prev]));
    }
    if (paramSide === "BUY" || paramSide === "SELL") {
      setSide(paramSide);
    }
  }, [paramSym, paramSide]);

  const activeSymbols = useMemo(() => {
    const extra = livePositions.map((p) => p.symbol);
    return Array.from(new Set([...watchlistSymbols, sym, ...extra]));
  }, [watchlistSymbols, sym, livePositions]);

  const {
    quotes,
    quoteMap,
    marketStatus,
    flashMap,
    loading: quotesLoading,
    refresh: refreshQuotes,
  } = useLiveMarketQuotes(activeSymbols, { pollMs: 5000 });

  const {
    candles,
    quote: candleQuote,
    loading: candlesLoading,
    refreshing: candlesRefreshing,
  } = useLiveCandles(sym, tf, { pollMs: 8000 });

  useEffect(() => {
    const q = searchQuery.trim();
    if (!q) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const t = setTimeout(async () => {
      try {
        const list = await searchMarketSymbols(q);
        setSearchResults(list);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const activeQuote = quoteMap[sym] || candleQuote;
  const lotSize = activeQuote?.lot || 1;
  const ltp = activeQuote?.ltp || candles[candles.length - 1]?.close || 0;
  const chgPct = activeQuote?.changePct ?? 0;
  const qty = Math.max(1, lots) * lotSize;
  const price = ltp;
  const estValue = +(price * qty).toFixed(2);
  const dayHi = Number(activeQuote?.high || ltp);
  const dayLo = Number(activeQuote?.low || ltp);
  const dayRangePct =
    dayHi > dayLo ? Math.max(0, Math.min(100, ((ltp - dayLo) / (dayHi - dayLo)) * 100)) : 50;

  const filteredWatchQuotes = useMemo(() => {
    return quotes.filter((q) => {
      if (exchangeFilter !== "ALL" && q.exchange !== exchangeFilter) return false;
      if (watchFilter === "INDEX") return q.kind === "INDEX";
      if (watchFilter === "EQUITY") return q.kind === "EQUITY";
      if (watchFilter === "OPTION") return q.kind === "OPTION";
      return true;
    });
  }, [quotes, watchFilter, exchangeFilter]);

  const ordersToShow = authenticated ? liveOrders : [];
  const positionsWithLiveMtm = useMemo(() => {
    const raw = authenticated ? livePositions : [];
    return raw.map((p) => {
      const liveLtp = quoteMap[p.symbol]?.ltp ?? p.ltp ?? p.avg;
      const mtm = +((liveLtp - p.avg) * p.qty).toFixed(2);
      return { ...p, ltp: +Number(liveLtp).toFixed(2), pnl: mtm };
    });
  }, [authenticated, livePositions, quoteMap]);
  const tradesToShow = authenticated ? liveTrades : [];

  const pickSearchInstrument = (item) => {
    if (!watchlistSymbols.includes(item.symbol)) {
      setWatchlistSymbols((prev) => [item.symbol, ...prev]);
    }
    setExchangeFilter("ALL");
    setWatchFilter("ALL");
    setSym(item.symbol);
    setSearchQuery("");
    setSearchResults([]);
  };

  const handlePlaceClick = () => {
    if (
      !authenticated ||
      !hasActiveAccount ||
      !activeAccount ||
      Number(activeAccount.balance || 0) <= 0
    ) {
      setPurchasePopup(true);
      return;
    }
    setConfirm(true);
  };

  const handleSubmitOrder = async () => {
    if (!ltp) {
      toast.error("Waiting for live price before placing order.");
      return;
    }
    if (!authenticated || !hasActiveAccount) {
      setConfirm(false);
      setPurchasePopup(true);
      return;
    }
    try {
      const cleanNote = note.trim();
      const res = await placeOrder({
        symbol: sym,
        side,
        qty,
        type: "MARKET",
        note: cleanNote,
      });
      setConfirm(false);
      setNote("");
      toast.success(
        `${side} ${qty} ${sym} — ${res?.order?.status?.toLowerCase() || "executed"}${cleanNote ? " · Note saved to Trade Book" : ""}`,
      );
    } catch (err) {
      if (err?.response?.data?.code === "NO_ACTIVE_ACCOUNT") {
        setConfirm(false);
        setPurchasePopup(true);
        return;
      }
      toast.error(formatApiError(err?.response?.data?.detail, "Order failed"));
    }
  };

  const handleClosePosition = async (pos) => {
    if (!authenticated || !pos.id) return;
    try {
      const res = await closePosition(pos.id);
      const realized = res?.trade?.pnl ?? 0;
      toast.success(
        `Closed ${pos.symbol} (${realized >= 0 ? "+" : "−"}${formatINR(Math.abs(realized))})`,
      );
    } catch (err) {
      if (err?.response?.data?.code === "NO_ACTIVE_ACCOUNT") {
        setPurchasePopup(true);
        return;
      }
      toast.error(formatApiError(err?.response?.data?.detail, "Unable to square off position"));
    }
  };

  const saveEditedNote = async (e) => {
    e.preventDefault();
    if (!noteEditor) return;
    try {
      await updateNote(noteEditor.kind, noteEditor.id, noteEditor.note);
      toast.success("Trade note updated");
      setNoteEditor(null);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not update note"));
    }
  };

  return (
    <div>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-[var(--border)]">
          <div className="flex items-center gap-3 flex-wrap">
            <LiveFeedBadge status={marketStatus} />
            <span className="text-xs font-mono text-[var(--muted-2)]">
              TradingView Powered Chart · Watchlist &amp; Instant Order Ticket
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={refreshQuotes}
              className="btn-ghost rounded-full px-3.5 py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> Refresh prices
            </button>
            <Link
              to={authenticated ? "/app/terminal" : "/login?next=/app/terminal"}
              className="btn-amber rounded-full px-4 py-1.5 text-xs font-semibold inline-flex items-center gap-1.5"
            >
              Open Full Terminal <ArrowRight size={12} />
            </Link>
          </div>
        </div>
      ) : (
        <PageHead
          title="Trading terminal"
          badge={<LiveFeedBadge status={marketStatus} />}
          sub="Live TradingView charts with NSE & BSE quotes. Every BUY or SELL note saves straight to your Trade Book."
        >
          <button
            type="button"
            onClick={refreshQuotes}
            className="btn-ghost rounded-full px-4 py-2 text-xs inline-flex items-center gap-2"
          >
            <RefreshCw size={13} /> Refresh prices
          </button>
        </PageHead>
      )}

      {authenticated && activeAccount ? (
        <div className="card-panel p-4 mb-5 flex flex-wrap items-center justify-between gap-4 tabular-nums">
          <div className="flex items-center gap-3 flex-wrap">
            <label
              htmlFor="acct-select"
              className="text-[11px] uppercase tracking-wider font-mono text-[var(--muted-2)]"
            >
              Account
            </label>
            <select
              id="acct-select"
              value={activeAccount.id}
              onChange={(e) => selectAccount(e.target.value)}
              className="input-dark !w-auto !py-1.5 !px-3 text-xs font-mono"
              data-testid="terminal-account-select"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number || a.id} · {a.plan_name} ({a.account_type})
                </option>
              ))}
            </select>
            <StatusPill status={activeAccount.status} />
          </div>
          <div className="flex flex-wrap gap-6 text-xs">
            <div>
              <span className="text-[var(--muted-2)] block text-[10px] uppercase font-mono">
                Capital
              </span>
              <strong className="font-mono text-sm text-white">
                {inr(activeAccount.starting_capital)}
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted-2)] block text-[10px] uppercase font-mono">
                Balance
              </span>
              <strong className="font-mono text-sm text-white">{inr(activeAccount.balance)}</strong>
            </div>
            <div>
              <span className="text-[var(--muted-2)] block text-[10px] uppercase font-mono">
                Realized P&amp;L
              </span>
              <strong className={`font-mono text-sm ${pnlCls(activeAccount.realized_pnl || 0)}`}>
                {signed(activeAccount.realized_pnl || 0)}
              </strong>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="card-panel p-4 mb-5 flex flex-wrap items-center justify-between gap-4 border-[var(--accent)]/35 bg-[var(--accent)]/5"
          data-testid="terminal-unfunded-banner"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl grid place-items-center bg-[var(--accent)]/15 text-[var(--accent)] shrink-0">
              <Lock size={16} />
            </div>
            <div>
              <div className="text-sm font-semibold text-white">
                Balance ₹0 — No active purchased plan
              </div>
              <p className="text-xs text-[var(--muted)]">
                Explore live NSE & BSE prices here. Purchase a challenge plan first to unlock order
                execution.
              </p>
            </div>
          </div>
          <Link
            to="/challenges"
            className="btn-amber rounded-full px-4 py-2 text-xs font-semibold inline-flex items-center gap-1.5"
          >
            Purchase plan <ArrowRight size={13} />
          </Link>
        </div>
      )}

      {/* Live NSE & BSE Index Tape */}
      <div
        className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-5"
        data-testid="index-ticker-strip"
      >
        {EXCHANGE_INDEX_SYMBOLS.slice(0, 7).map((idxSym) => {
          const iq = quoteMap[idxSym];
          const isSel = sym === idxSym;
          const up = (iq?.changePct ?? 0) >= 0;
          return (
            <button
              key={idxSym}
              type="button"
              onClick={() => setSym(idxSym)}
              className={`rounded-xl px-3 py-2 text-left border transition tabular-nums ${
                isSel
                  ? "border-[var(--accent)] bg-[var(--accent)]/12"
                  : "border-[var(--border)] bg-[var(--bg-1)] hover:border-[var(--border-hi)]"
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--muted-2)]">
                <span className="font-semibold text-white">{idxSym}</span>
                <span>{iq?.exchange || "NSE"}</span>
              </div>
              <div className="font-mono text-sm font-semibold text-white mt-0.5">
                {iq?.ltp ? formatPrice(iq.ltp) : "—"}
              </div>
              {iq && (
                <div
                  className={`text-[10px] font-mono ${up ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}
                >
                  {up ? "+" : ""}
                  {iq.changePct.toFixed(2)}%
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="terminal-layout">
        {/* Live NSE & BSE Watchlist */}
        <aside className="card-panel p-4 watchlist-panel" aria-label="NSE and BSE Watchlist">
          <div className="relative">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted-2)]"
            />
            <input
              type="text"
              className="input-dark !pl-8 !pr-7 !py-2 text-xs"
              placeholder="Search shares or options (NIFTY 25500 CE)…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="terminal-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--muted-2)] hover:text-white"
                aria-label="Clear search"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {searchQuery.trim() ? (
            <div
              className="watchlist-scroll mt-3 divide-y divide-[var(--border)]"
              data-testid="terminal-search-results"
            >
              {searching ? (
                <div className="text-xs text-[var(--muted)] py-4 text-center">
                  Searching NSE, BSE & Options…
                </div>
              ) : searchResults.length ? (
                searchResults.map((item) => (
                  <button
                    key={item.providerSymbol}
                    type="button"
                    onClick={() => pickSearchInstrument(item)}
                    data-testid={`search-result-${item.symbol}`}
                    className="watchlist-row w-full text-left"
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-xs font-semibold text-white flex items-center gap-1.5 flex-wrap">
                        <span>{item.symbol}</span>
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-[var(--muted-2)]">
                          {item.exchange}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded ${
                            item.kind === "OPTION"
                              ? item.optionType === "PE"
                                ? "bg-rose-500/15 text-rose-300"
                                : "bg-emerald-500/15 text-emerald-300"
                              : item.kind === "INDEX"
                                ? "bg-amber-500/15 text-amber-300"
                                : "bg-sky-500/15 text-sky-300"
                          }`}
                        >
                          {item.kind === "OPTION"
                            ? item.optionType || "OPT"
                            : item.kind === "INDEX"
                              ? "IDX"
                              : "SHARE"}
                        </span>
                      </div>
                      <div className="text-[11px] text-[var(--muted-2)] truncate">
                        {item.name}
                        {item.lot > 1 ? ` · Lot ${item.lot}` : ""}
                      </div>
                    </div>
                    <span className="text-[11px] text-[var(--accent)] font-mono shrink-0">
                      + Load
                    </span>
                  </button>
                ))
              ) : (
                <div className="text-xs text-[var(--muted)] py-4 text-center">
                  No matching shares or options. Try NIFTY 25500 CE or RELIANCE.
                </div>
              )}
            </div>
          ) : (
            <>
              <div className="seg w-full mt-3">
                {[
                  ["ALL", "All Exch"],
                  ["NSE", "NSE"],
                  ["BSE", "BSE"],
                ].map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    className={`flex-1 ${exchangeFilter === k ? "is-on" : ""}`}
                    onClick={() => setExchangeFilter(k)}
                    data-testid={`exch-filter-${k.toLowerCase()}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="seg w-full mt-2">
                {[
                  ["ALL", "All"],
                  ["INDEX", "Indices"],
                  ["EQUITY", "Shares"],
                  ["OPTION", "Options"],
                ].map(([k, lbl]) => (
                  <button
                    key={k}
                    type="button"
                    className={`flex-1 ${watchFilter === k ? "is-on" : ""}`}
                    onClick={() => setWatchFilter(k)}
                    data-testid={`kind-filter-${k.toLowerCase()}`}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="watchlist-scroll mt-3 divide-y divide-[var(--border)]">
                {quotesLoading && !filteredWatchQuotes.length ? (
                  <div className="text-xs text-[var(--muted)] py-6 text-center">
                    Fetching live NSE & BSE quotes…
                  </div>
                ) : (
                  filteredWatchQuotes.map((q) => {
                    const active = q.symbol === sym;
                    const up = q.changePct >= 0;
                    const flash = flashMap[q.symbol];
                    return (
                      <button
                        key={q.symbol}
                        type="button"
                        onClick={() => setSym(q.symbol)}
                        data-testid={`watch-${q.symbol}`}
                        className={`watchlist-row w-full text-left tabular-nums ${active ? "is-selected" : ""} ${flash ? `tick-${flash}` : ""}`}
                      >
                        <div className="min-w-0">
                          <div className="font-mono text-xs font-semibold text-white flex items-center gap-1.5">
                            {q.symbol}
                            <span className="text-[9px] text-[var(--muted-2)] font-normal">
                              {q.kind === "OPTION" ? `${q.exchange} OPT` : q.exchange}
                            </span>
                          </div>
                          <div className="text-[11px] text-[var(--muted-2)] truncate">{q.name}</div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-mono text-xs text-white">
                            {q.kind === "INDEX" ? formatPrice(q.ltp) : `₹${formatPrice(q.ltp)}`}
                          </div>
                          <div
                            className={`text-[11px] font-mono ${up ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}
                          >
                            {up ? "+" : ""}
                            {q.changePct.toFixed(2)}%
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </>
          )}
        </aside>

        {/* Chart Area */}
        <div className="card-panel p-4 md:p-5 min-w-0">
          <div className="flex flex-wrap gap-2 items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-display text-xl text-white">{activeQuote?.name || sym}</h2>
                <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-2)]">
                  {activeQuote?.exchange || "NSE"} · {activeQuote?.source || "Feed"}
                </span>
              </div>
              {activeQuote && (
                <div className="text-[11px] font-mono text-[var(--muted-2)] mt-0.5 tabular-nums">
                  Prev Close {formatPrice(activeQuote.prevClose)} · Day H{" "}
                  <span className="text-[var(--emerald)]">{formatPrice(activeQuote.high)}</span> ·
                  Day L <span className="text-[var(--rose)]">{formatPrice(activeQuote.low)}</span>
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="seg" role="tablist" aria-label="Chart mode">
                <button
                  type="button"
                  className={chartMode === "candle" ? "is-on" : ""}
                  onClick={() => setChartMode("candle")}
                >
                  Candles
                </button>
                <button
                  type="button"
                  className={chartMode === "area" ? "is-on" : ""}
                  onClick={() => setChartMode("area")}
                >
                  Area
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowEma((v) => !v)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono border transition ${
                  showEma
                    ? "border-amber-500/60 bg-amber-500/15 text-amber-300"
                    : "border-[var(--border)] text-[var(--muted-2)]"
                }`}
              >
                EMA20
              </button>
              <div className="seg" role="tablist" aria-label="Timeframe">
                {TIMEFRAMES.map((t) => (
                  <button
                    key={t}
                    role="tab"
                    aria-selected={tf === t}
                    className={tf === t ? "is-on" : ""}
                    onClick={() => setTf(t)}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-baseline justify-between gap-4 mt-4 tabular-nums">
            <div className="flex items-baseline gap-3">
              <div
                className={`font-display text-3xl ${flashMap[sym] ? `tick-text-${flashMap[sym]}` : ""}`}
              >
                {ltp
                  ? activeQuote?.kind === "INDEX"
                    ? formatPrice(ltp)
                    : `₹${formatPrice(ltp)}`
                  : "—"}
              </div>
              {activeQuote && (
                <div className={`text-sm font-mono ${pnlCls(chgPct)}`}>
                  {activeQuote.change >= 0 ? "+" : ""}
                  {formatPrice(activeQuote.change)} ({chgPct >= 0 ? "+" : ""}
                  {chgPct.toFixed(2)}%)
                </div>
              )}
            </div>
            {activeQuote && (
              <div className="flex items-center gap-2 text-[11px] font-mono text-[var(--muted-2)] min-w-[180px]">
                <span className="text-[var(--rose)]">{formatPrice(dayLo, 0)}</span>
                <div className="relative h-1.5 flex-1 rounded-full bg-[var(--bg-1)] border border-[var(--border)] overflow-hidden">
                  <div
                    className="absolute top-0 bottom-0 w-2 rounded-full bg-[var(--accent)]"
                    style={{ left: `calc(${dayRangePct}% - 4px)` }}
                  />
                </div>
                <span className="text-[var(--emerald)]">{formatPrice(dayHi, 0)}</span>
              </div>
            )}
          </div>

          <div className="mt-3">
            <CandleChart
              candles={candles}
              symbol={sym}
              loading={candlesLoading}
              refreshing={candlesRefreshing}
              mode={chartMode}
              showEma={showEma}
            />
          </div>

          {/* Live Admin-Governed Rule Guardrails Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-4 pt-3 border-t border-[var(--border)] text-[11px] font-mono tabular-nums">
            <div>
              <span className="text-[var(--muted-2)] block text-[10px]">Profit Target</span>
              <strong className="text-white">
                {activeAccount?.profit_target_pct ?? evaluationRisk.profit_target_pct ?? 8}%
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted-2)] block text-[10px]">Daily Loss Cap</span>
              <strong className="text-white">
                {activeAccount?.daily_loss_limit_pct ?? evaluationRisk.daily_loss_limit_pct ?? 5}%
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted-2)] block text-[10px]">Max Drawdown</span>
              <strong className="text-white">
                {activeAccount?.max_loss_limit ?? evaluationRisk.max_loss_limit ?? 20}%
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted-2)] block text-[10px]">Daily Cap</span>
              <strong className="text-white">
                {activeAccount?.trades_per_day ?? evaluationRisk.trades_per_day ?? 5} trades
              </strong>
            </div>
            <div>
              <span className="text-[var(--muted-2)] block text-[10px]">Profit Split</span>
              <strong className="text-[var(--emerald)]">
                {activeAccount?.profit_split ?? evaluationRisk.profit_split ?? 70}%
              </strong>
            </div>
          </div>
        </div>

        {/* Order Execution Ticket */}
        <div className="card-panel p-5 order-panel tabular-nums">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted-2)]">
              Order ticket
            </span>
            <span className="text-[11px] font-mono text-[var(--emerald)]">{sym}</span>
          </div>
          <div className="seg w-full" role="tablist" aria-label="Side">
            {["BUY", "SELL"].map((s) => (
              <button
                key={s}
                type="button"
                className={`flex-1 ${side === s ? (s === "BUY" ? "is-buy" : "is-sell") : ""}`}
                onClick={() => setSide(s)}
                data-testid={`terminal-side-${s.toLowerCase()}`}
              >
                {s}
              </button>
            ))}
          </div>

          <label className="dash-label" htmlFor="lots">
            {lotSize > 1 ? `Lots (1 lot = ${lotSize} qty)` : "Quantity (shares)"}
          </label>
          <div className="qty">
            <button
              type="button"
              onClick={() => setLots(Math.max(1, lots - 1))}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <input
              id="lots"
              type="number"
              min="1"
              max="500"
              value={lots}
              onChange={(e) => setLots(Math.min(500, Math.max(1, Number(e.target.value) || 1)))}
            />
            <button
              type="button"
              onClick={() => setLots(Math.min(500, lots + 1))}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[1, 2, 5, 10].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setLots(preset)}
                className={`py-1 rounded-lg text-[11px] font-mono border transition ${
                  lots === preset
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white"
                    : "border-[var(--border)] text-[var(--muted-2)] hover:text-white"
                }`}
              >
                {preset}x
              </button>
            ))}
          </div>

          <label className="dash-label flex items-center gap-1.5" htmlFor="trade-note">
            <StickyNote size={11} className="text-[var(--accent-hi)]" />
            Trade note (saved in Trade Book)
          </label>
          <textarea
            id="trade-note"
            rows={2}
            maxLength={400}
            className="input-dark !min-h-[64px] text-xs"
            placeholder="Setup, entry logic, target or stop note…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid="terminal-note-input"
          />

          <div className="order-summary">
            <div>
              <span>Instrument</span>
              <strong>{sym}</strong>
            </div>
            <div>
              <span>Total Qty</span>
              <strong>{qty}</strong>
            </div>
            <div>
              <span>Live Price</span>
              <strong>{price ? formatPrice(price) : "—"}</strong>
            </div>
            <div>
              <span>Order Value</span>
              <strong>{price ? inr(estValue) : "—"}</strong>
            </div>
          </div>

          <button
            type="button"
            disabled={!ltp || submitting}
            className={`w-full rounded-full py-3 font-semibold mt-2 disabled:opacity-50 ${side === "BUY" ? "btn-buy" : "btn-sell"}`}
            onClick={handlePlaceClick}
            data-testid="terminal-place-btn"
          >
            {side} {sym}
          </button>
        </div>
      </div>

      {(!embedded || authenticated) && (
        <>
          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div>
              <h2 className="font-display text-xl mb-3">
                Open positions ({positionsWithLiveMtm.length})
              </h2>
              <PositionsTable rows={positionsWithLiveMtm} onClose={handleClosePosition} />
            </div>
            <div>
              <h2 className="font-display text-xl mb-3">Recent orders ({ordersToShow.length})</h2>
              <OrdersTable
                rows={ordersToShow.slice(0, 6)}
                onEditNote={(r) => setNoteEditor({ kind: "order", id: r.id, note: r.note || "" })}
              />
            </div>
          </div>

          <div className="flex items-center justify-between mt-8 mb-3">
            <h2 className="font-display text-xl">Recent closed trades</h2>
            <Link to="/app/tradebook" className="text-xs text-[var(--accent-hi)] hover:underline">
              Open full Trade Book →
            </Link>
          </div>
          <TradesTable
            rows={tradesToShow.slice(0, 6)}
            onEditNote={(r) => setNoteEditor({ kind: "trade", id: r.id, note: r.note || "" })}
          />
        </>
      )}

      {/* Purchase a plan first guard dialog */}
      <Dialog open={purchasePopup} onOpenChange={setPurchasePopup}>
        <DialogContent
          className="max-w-sm bg-[var(--bg-2)] border-[var(--border)] text-white"
          data-testid="purchase-first-dialog"
        >
          <div className="w-11 h-11 rounded-2xl bg-[var(--accent)]/15 text-[var(--accent)] grid place-items-center mb-2">
            <Lock size={20} />
          </div>
          <DialogTitle className="font-display text-2xl">Purchase a plan first</DialogTitle>
          <DialogDescription className="text-sm text-[var(--muted)]">
            {!authenticated
              ? "Sign in and purchase a challenge plan to unlock simulated trading capital and execute orders."
              : "Your trading capital is currently ₹0. You need an active purchased challenge or funded account before placing BUY or SELL orders."}
          </DialogDescription>
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            <button
              type="button"
              className="flex-1 rounded-full py-2.5 px-4 border border-[var(--border-hi)] text-sm"
              onClick={() => setPurchasePopup(false)}
            >
              Close
            </button>
            <Link
              to="/challenges"
              onClick={() => setPurchasePopup(false)}
              className="flex-1 btn-amber rounded-full py-2.5 px-4 text-sm font-semibold text-center inline-flex items-center justify-center gap-1.5"
              data-testid="purchase-first-cta"
            >
              Buy a plan <ArrowRight size={14} />
            </Link>
          </div>
        </DialogContent>
      </Dialog>

      {/* Order Confirmation */}
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent className="max-w-sm bg-[var(--bg-2)] border-[var(--border)] text-white">
          <DialogTitle>Confirm {side.toLowerCase()} order</DialogTitle>
          <DialogDescription>
            Executes market order on account{" "}
            {activeAccount?.account_number || activeAccount?.id || "wallet"}.
          </DialogDescription>
          <div className="order-summary tabular-nums">
            <div>
              <span>Instrument</span>
              <strong>
                {sym} ({activeQuote?.exchange || "NSE"})
              </strong>
            </div>
            <div>
              <span>Quantity</span>
              <strong>{qty}</strong>
            </div>
            <div>
              <span>Execution price</span>
              <strong>{formatPrice(price)}</strong>
            </div>
            <div>
              <span>Order value</span>
              <strong>{inr(estValue)}</strong>
            </div>
            {note.trim() && (
              <div>
                <span>Trade note</span>
                <strong className="text-right max-w-[190px] truncate text-[var(--emerald)]">
                  {note.trim()}
                </strong>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-2">
            <button
              type="button"
              className="flex-1 rounded-full py-2.5 border border-[var(--border-hi)]"
              onClick={() => setConfirm(false)}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting}
              className={`flex-1 rounded-full py-2.5 font-semibold disabled:opacity-50 ${side === "BUY" ? "btn-buy" : "btn-sell"}`}
              onClick={handleSubmitOrder}
              data-testid="terminal-confirm-btn"
            >
              {submitting ? "Placing…" : "Place order"}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Inline Note Editor */}
      <Dialog open={!!noteEditor} onOpenChange={(v) => !v && setNoteEditor(null)}>
        <DialogContent className="max-w-sm bg-[var(--bg-2)] border-[var(--border)] text-white">
          <DialogTitle>Edit Trade Note</DialogTitle>
          <DialogDescription>
            Record setup notes or review comments for {noteEditor?.id}.
          </DialogDescription>
          <form onSubmit={saveEditedNote} className="space-y-4">
            <textarea
              rows={3}
              maxLength={400}
              className="input-dark text-sm"
              placeholder="Write trade reasoning or journal note…"
              value={noteEditor?.note || ""}
              onChange={(e) =>
                setNoteEditor((prev) => (prev ? { ...prev, note: e.target.value } : prev))
              }
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full py-2 border border-[var(--border-hi)] text-sm"
                onClick={() => setNoteEditor(null)}
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 btn-amber rounded-full py-2 text-sm">
                Save note
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- tables ---------- */
function NoteCell({ note, onEdit }) {
  return (
    <div className="flex items-center gap-2 max-w-[220px]">
      <span
        className={`truncate text-xs ${note ? "text-white" : "text-[var(--muted-2)] italic"}`}
        title={note || ""}
      >
        {note || "—"}
      </span>
      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="text-[var(--muted-2)] hover:text-[var(--emerald)] shrink-0 p-1 rounded"
          title={note ? "Edit note" : "Add note"}
          aria-label="Edit trade note"
        >
          <Pencil size={11} />
        </button>
      )}
    </div>
  );
}

function TradesTable({ rows, onEditNote }) {
  return (
    <Table
      rows={rows}
      empty="No closed trades yet."
      cols={[
        {
          k: "id",
          label: "Trade ID",
          render: (r) => <span className="font-mono text-xs">{r.id}</span>,
        },
        { k: "symbol", label: "Instrument" },
        {
          k: "side",
          label: "Side",
          render: (r) => (
            <span className={r.side === "BUY" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>
              {r.side}
            </span>
          ),
        },
        { k: "entry", label: "Entry", right: true, render: (r) => formatPrice(r.entry) },
        { k: "exit", label: "Exit", right: true, render: (r) => formatPrice(r.exit) },
        { k: "qty", label: "Qty", right: true },
        {
          k: "note",
          label: "Note",
          render: (r) => (
            <NoteCell note={r.note} onEdit={onEditNote ? () => onEditNote(r) : null} />
          ),
        },
        {
          k: "out",
          label: "Exit time",
          render: (r) =>
            String(r.out || r.in || "")
              .slice(0, 16)
              .replace("T", " "),
        },
        {
          k: "pnl",
          label: "P&L",
          right: true,
          render: (r) => <span className={pnlCls(r.pnl)}>{signed(r.pnl)}</span>,
        },
      ]}
    />
  );
}

function PositionsTable({ rows, onClose }) {
  const cols = [
    { k: "symbol", label: "Instrument" },
    {
      k: "qty",
      label: "Qty",
      right: true,
      render: (r) => (
        <span className={r.qty >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>{r.qty}</span>
      ),
    },
    { k: "avg", label: "Avg entry", right: true, render: (r) => formatPrice(r.avg) },
    { k: "ltp", label: "Live LTP", right: true, render: (r) => formatPrice(r.ltp) },
    {
      k: "note",
      label: "Note",
      render: (r) => <NoteCell note={r.note} />,
    },
    {
      k: "pnl",
      label: "MTM P&L",
      right: true,
      render: (r) => <span className={pnlCls(r.pnl)}>{signed(r.pnl)}</span>,
    },
    { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
  ];
  if (onClose) {
    cols.push({
      k: "act",
      label: "",
      right: true,
      render: (r) => (
        <button
          type="button"
          onClick={() => onClose(r)}
          className="btn-ghost px-3 py-1 rounded-full text-xs text-[var(--rose)]"
        >
          Square off
        </button>
      ),
    });
  }
  return <Table rows={rows} empty="No open positions." cols={cols} />;
}

function OrdersTable({ rows, onEditNote }) {
  return (
    <Table
      rows={rows}
      empty="No orders placed yet."
      cols={[
        {
          k: "id",
          label: "Order ID",
          render: (r) => <span className="font-mono text-xs">{r.id}</span>,
        },
        { k: "symbol", label: "Instrument" },
        {
          k: "side",
          label: "Side",
          render: (r) => (
            <span className={r.side === "BUY" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>
              {r.side}
            </span>
          ),
        },
        { k: "qty", label: "Qty", right: true },
        { k: "price", label: "Price", right: true, render: (r) => formatPrice(r.price) },
        {
          k: "note",
          label: "Note",
          render: (r) => (
            <NoteCell note={r.note} onEdit={onEditNote ? () => onEditNote(r) : null} />
          ),
        },
        {
          k: "date",
          label: "Date",
          render: (r) =>
            String(r.date || "")
              .slice(0, 16)
              .replace("T", " "),
        },
        { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
      ]}
    />
  );
}

export function TradeBook() {
  const { activeAccount, orders, trades, updateNote } = useTraderState({ pollMs: 8000 });
  const [viewMode, setViewMode] = useState("all"); // "all" shows every Buy & Sell immediately; "closed" shows closed P&L ledger
  const [q, setQ] = useState("");
  const [searchText, setSearchText] = useState("");
  const [noteModal, setNoteModal] = useState(null);

  const filterFn = (row) => {
    const sym = String(row.symbol || "").toUpperCase();
    if (q === "NSE" && sym.endsWith(".BO")) return false;
    if (q === "BSE" && !sym.endsWith(".BO") && sym !== "SENSEX" && sym !== "BANKEX") return false;
    if (q && q !== "NSE" && q !== "BSE" && !sym.includes(q)) return false;
    if (searchText.trim()) {
      const needle = searchText.trim().toUpperCase();
      return (
        sym.includes(needle) ||
        String(row.id || "").toUpperCase().includes(needle) ||
        String(row.note || "").toUpperCase().includes(needle)
      );
    }
    return true;
  };

  const filteredOrders = orders.filter(filterFn);
  const filteredTrades = trades.filter(filterFn);
  const totalPnl = filteredTrades.reduce((s, t) => s + Number(t.pnl || 0), 0);
  const notesCount = filteredOrders.filter((o) => String(o.note || "").trim()).length;

  const saveNote = async (e) => {
    e.preventDefault();
    if (!noteModal) return;
    try {
      await updateNote(noteModal.kind, noteModal.id, noteModal.note);
      toast.success("Note saved to Trade Book");
      setNoteModal(null);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not update note"));
    }
  };

  return (
    <div>
      <PageHead
        title="Trade book"
        sub={
          activeAccount
            ? `Every BUY & SELL execution, trade note, and realized P&L for ${activeAccount.account_number || activeAccount.id}.`
            : "Every BUY & SELL execution, journal note, and closed trade P&L."
        }
      >
        <div className="flex flex-wrap items-center gap-2">
          <div className="seg">
            <button
              type="button"
              className={viewMode === "all" ? "is-on" : ""}
              onClick={() => setViewMode("all")}
              data-testid="tradebook-tab-all"
            >
              Buy &amp; Sell Logs ({filteredOrders.length})
            </button>
            <button
              type="button"
              className={viewMode === "closed" ? "is-on" : ""}
              onClick={() => setViewMode("closed")}
              data-testid="tradebook-tab-closed"
            >
              Closed Trades ({filteredTrades.length})
            </button>
          </div>
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter symbol / note / ID…"
            className="input-dark !w-48 !py-1.5 !px-3 text-xs"
          />
          <div className="seg flex-wrap">
            {[
              ["", "All"],
              ["NIFTY", "NIFTY"],
              ["BANKNIFTY", "BANK NIFTY"],
              ["SENSEX", "SENSEX"],
              ["NSE", "NSE"],
              ["BSE", "BSE"],
            ].map(([val, lbl]) => (
              <button
                key={val || "all"}
                className={q === val ? "is-on" : ""}
                onClick={() => setQ(val)}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>
      </PageHead>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Kpi label="Buy & sell executions" value={filteredOrders.length} icon={Activity} />
        <Kpi label="Trades with notes" value={notesCount} icon={StickyNote} />
        <Kpi
          label="Winning closes"
          value={filteredTrades.filter((t) => t.pnl > 0).length}
          icon={TrendingUp}
        />
        <Kpi label="Realized P&L" value={signed(totalPnl)} tone={pnlCls(totalPnl)} icon={Wallet} />
      </div>

      {viewMode === "all" ? (
        <Table
          rows={filteredOrders}
          empty="Place a BUY or SELL trade in the Terminal — your execution & trade note appear here immediately."
          cols={[
            {
              k: "id",
              label: "Exec ID",
              render: (r) => <span className="font-mono text-xs">{r.id}</span>,
            },
            { k: "symbol", label: "Instrument" },
            {
              k: "side",
              label: "Side",
              render: (r) => (
                <span
                  className={`font-semibold ${r.side === "BUY" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}
                >
                  {r.side}
                </span>
              ),
            },
            { k: "qty", label: "Qty", right: true },
            { k: "price", label: "Exec price", right: true, render: (r) => formatPrice(r.price) },
            {
              k: "note",
              label: "Trade note",
              render: (r) => (
                <NoteCell
                  note={r.note}
                  onEdit={() => setNoteModal({ kind: "order", id: r.id, note: r.note || "" })}
                />
              ),
            },
            {
              k: "date",
              label: "Time",
              render: (r) =>
                String(r.date || r.created_at || "")
                  .slice(0, 16)
                  .replace("T", " "),
            },
            { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
          ]}
        />
      ) : (
        <TradesTable
          rows={filteredTrades}
          onEditNote={(r) => setNoteModal({ kind: "trade", id: r.id, note: r.note || "" })}
        />
      )}

      <Dialog open={!!noteModal} onOpenChange={(v) => !v && setNoteModal(null)}>
        <DialogContent className="max-w-sm bg-[var(--bg-2)] border-[var(--border)] text-white">
          <DialogTitle>Trade Book Note</DialogTitle>
          <DialogDescription>
            Update trade note for {noteModal?.id}.
          </DialogDescription>
          <form onSubmit={saveNote} className="space-y-4">
            <textarea
              rows={3}
              maxLength={400}
              className="input-dark text-sm"
              placeholder="Entry thesis, chart pattern, or exit reflection…"
              value={noteModal?.note || ""}
              onChange={(e) =>
                setNoteModal((prev) => (prev ? { ...prev, note: e.target.value } : prev))
              }
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full py-2 border border-[var(--border-hi)] text-sm"
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 btn-amber rounded-full py-2 text-sm">
                Save note
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function Positions() {
  const { authenticated, activeAccount, positions, closePosition } = useTraderState({ pollMs: 5000 });
  const symbols = useMemo(() => {
    const set = new Set(["NIFTY", "BANKNIFTY", ...positions.map((p) => p.symbol)]);
    return Array.from(set);
  }, [positions]);
  const { quoteMap, marketStatus } = useLiveMarketQuotes(symbols, { pollMs: 5000 });
  const liveRows = useMemo(
    () =>
      positions.map((p) => {
        const ltp = quoteMap[p.symbol]?.ltp ?? p.ltp ?? p.avg;
        const pnl = +((ltp - p.avg) * p.qty).toFixed(2);
        return { ...p, ltp: +Number(ltp).toFixed(2), pnl };
      }),
    [positions, quoteMap],
  );
  const total = liveRows.reduce((s, p) => s + p.pnl, 0);
  const grossExposure = liveRows.reduce((s, p) => s + Math.abs(Number(p.ltp || 0) * Number(p.qty || 0)), 0);

  const handleClose = async (pos) => {
    if (!authenticated || !pos.id) return;
    try {
      await closePosition(pos.id);
      toast.success(`Closed ${pos.symbol}`);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Square off failed"));
    }
  };

  return (
    <div>
      <PageHead
        title="Positions"
        badge={<LiveFeedBadge status={marketStatus} />}
        sub="Open positions on your active account marked live to NSE & BSE prices."
      >
        <Link to="/app/terminal" className="btn-amber rounded-full px-5 py-2 text-xs font-semibold">
          Trade in Terminal
        </Link>
      </PageHead>
      <div className="grid sm:grid-cols-3 gap-4 mb-6">
        <Kpi label="Open positions" value={liveRows.length} sub={activeAccount?.account_number} icon={Activity} />
        <Kpi label="Position value" value={inr(grossExposure)} icon={Wallet} />
        <Kpi label="Unrealised MTM" value={signed(total)} tone={pnlCls(total)} icon={TrendingUp} />
      </div>
      <PositionsTable rows={liveRows} onClose={authenticated ? handleClose : null} />
    </div>
  );
}

export function Orders() {
  const { orders, updateNote } = useTraderState({ pollMs: 6000 });
  const [f, setF] = useState("All");
  const [exch, setExch] = useState("");
  const [searchText, setSearchText] = useState("");
  const [noteModal, setNoteModal] = useState(null);

  const rows = orders.filter((o) => {
    if (f !== "All" && o.status !== f) return false;
    const sym = String(o.symbol || "").toUpperCase();
    if (exch === "NSE" && sym.endsWith(".BO")) return false;
    if (exch === "BSE" && !sym.endsWith(".BO") && sym !== "SENSEX" && sym !== "BANKEX")
      return false;
    if (exch && exch !== "NSE" && exch !== "BSE" && !sym.includes(exch)) return false;
    if (searchText.trim()) {
      const needle = searchText.trim().toUpperCase();
      return (
        sym.includes(needle) ||
        String(o.id || "").toUpperCase().includes(needle) ||
        String(o.note || "").toUpperCase().includes(needle)
      );
    }
    return true;
  });

  const buyCount = rows.filter((r) => r.side === "BUY").length;
  const sellCount = rows.filter((r) => r.side === "SELL").length;
  const execCount = rows.filter((r) => r.status === "Executed").length;

  const saveNote = async (e) => {
    e.preventDefault();
    if (!noteModal) return;
    try {
      await updateNote("order", noteModal.id, noteModal.note);
      toast.success("Order note saved");
      setNoteModal(null);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not update note"));
    }
  };

  return (
    <div>
      <PageHead
        title="Orders"
        sub="All NSE, BSE, NIFTY, BANK NIFTY & equity orders placed on your trading account."
      >
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Filter symbol / note / ID…"
            className="input-dark !w-44 !py-1.5 !px-3 text-xs"
          />
          <div className="seg flex-wrap">
            {[
              ["", "All"],
              ["NIFTY", "NIFTY"],
              ["BANKNIFTY", "BANK NIFTY"],
              ["SENSEX", "SENSEX"],
              ["NSE", "NSE"],
              ["BSE", "BSE"],
            ].map(([val, lbl]) => (
              <button
                key={val || "all"}
                className={exch === val ? "is-on" : ""}
                onClick={() => setExch(val)}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="seg">
            {["All", "Executed", "Pending", "Cancelled"].map((s) => (
              <button key={s} className={f === s ? "is-on" : ""} onClick={() => setF(s)}>
                {s}
              </button>
            ))}
          </div>
        </div>
      </PageHead>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi label="Total orders" value={rows.length} icon={Activity} />
        <Kpi label="Executed" value={execCount} tone="text-[var(--emerald)]" icon={CheckCircle2} />
        <Kpi label="Buy orders" value={buyCount} tone="text-[var(--emerald)]" />
        <Kpi label="Sell orders" value={sellCount} tone="text-[var(--rose)]" />
      </div>

      <OrdersTable
        rows={rows}
        onEditNote={(r) => setNoteModal({ id: r.id, note: r.note || "" })}
      />

      <Dialog open={!!noteModal} onOpenChange={(v) => !v && setNoteModal(null)}>
        <DialogContent className="max-w-sm bg-[var(--bg-2)] border-[var(--border)] text-white">
          <DialogTitle>Order Note</DialogTitle>
          <DialogDescription>Edit note for order {noteModal?.id}.</DialogDescription>
          <form onSubmit={saveNote} className="space-y-4">
            <textarea
              rows={3}
              maxLength={400}
              className="input-dark text-sm"
              placeholder="Write setup or entry reasoning…"
              value={noteModal?.note || ""}
              onChange={(e) =>
                setNoteModal((prev) => (prev ? { ...prev, note: e.target.value } : prev))
              }
            />
            <div className="flex gap-2">
              <button
                type="button"
                className="flex-1 rounded-full py-2 border border-[var(--border-hi)] text-sm"
                onClick={() => setNoteModal(null)}
              >
                Cancel
              </button>
              <button type="submit" className="flex-1 btn-amber rounded-full py-2 text-sm">
                Save note
              </button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ---------- Evaluation (Unified Challenge Progress & Guardrails) ---------- */
export function EvaluationProgress() {
  const { activeAccount, accounts, evaluationRisk, orders, trades, selectAccount, loading } =
    useTraderState({
      pollMs: 8000,
    });

  if (loading && !activeAccount) {
    return (
      <div className="card-panel p-8 text-center text-[var(--muted)]">Loading evaluation…</div>
    );
  }

  if (!activeAccount) {
    return (
      <div>
        <PageHead
          title="Evaluation progress"
          sub="Track your challenge targets, drawdown limits, and trading day milestones."
        />
        <NoAccountCta
          title="Purchase a plan to start evaluation"
          message="Your evaluation targets and daily progress begin once you purchase a challenge plan or receive a funded account."
        />
      </div>
    );
  }

  const cap = Number(activeAccount.starting_capital || 0);
  const bal = Number(activeAccount.balance || 0);
  const pnl = +(bal - cap).toFixed(2);
  const targetPct = Number(
    activeAccount.profit_target_pct ?? evaluationRisk.profit_target_pct ?? 8,
  );
  const targetAmt = Math.round((cap * targetPct) / 100);
  const progress =
    targetAmt > 0 ? Math.max(0, Math.min(100, Math.round((pnl / targetAmt) * 100))) : 0;
  const remainingTarget = Math.max(0, Math.round(targetAmt - pnl));

  const minDays = Number(activeAccount.min_trading_days ?? evaluationRisk.min_trading_days ?? 10);
  const totalDays = Number(
    activeAccount.total_trading_days ?? evaluationRisk.total_trading_days ?? 30,
  );
  const daysDone =
    activeAccount.trading_days_done != null
      ? Number(activeAccount.trading_days_done)
      : new Set(trades.map((t) => String(t.created_at || t.out || "").slice(0, 10)).filter(Boolean))
          .size;
  const elapsedDefault = activeAccount.created_at
    ? Math.max(
        1,
        Math.min(
          totalDays,
          Math.floor((Date.now() - Date.parse(activeAccount.created_at)) / 86400000) + 1,
        ),
      )
    : 0;
  const daysElapsed =
    activeAccount.days_elapsed != null ? Number(activeAccount.days_elapsed) : elapsedDefault;

  const wins = trades.filter((t) => Number(t.pnl || 0) > 0).length;
  const actualAccuracy = trades.length ? Math.round((wins / trades.length) * 100) : 0;
  const targetAccuracy = Number(
    activeAccount.profit_accuracy_pct ?? evaluationRisk.profit_accuracy_pct ?? 70,
  );

  const maxLossPct = Number(activeAccount.max_loss_limit ?? evaluationRisk.max_loss_limit ?? 20);
  const dailyLossPct = Number(
    activeAccount.daily_loss_limit_pct ?? evaluationRisk.daily_loss_limit_pct ?? 5,
  );
  const overallLimit = Math.round((cap * maxLossPct) / 100);
  const dailyLimit = Math.round((cap * dailyLossPct) / 100);
  const ddUsed = Math.max(0, Math.round(cap - bal));
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRealized = trades
    .filter((t) => String(t.created_at || t.out || "").startsWith(todayStr))
    .reduce((s, t) => s + Number(t.pnl || 0), 0);
  const dailyLossUsed = Math.min(dailyLimit, Math.max(0, Math.round(-todayRealized)));
  const tradesToday = orders.filter((o) => String(o.created_at || "").startsWith(todayStr)).length;
  const maxTrades = Number(activeAccount.trades_per_day ?? evaluationRisk.trades_per_day ?? 5);

  return (
    <div>
      <PageHead
        title="Evaluation progress"
        sub={`${activeAccount.plan_name} (${activeAccount.account_type || "Challenge"}) · ${activeAccount.account_number || activeAccount.id}`}
      >
        <div className="flex items-center gap-3 flex-wrap">
          {accounts.length > 1 && (
            <select
              value={activeAccount.id}
              onChange={(e) => selectAccount(e.target.value)}
              className="input-dark !w-auto !py-1.5 !px-3 text-xs font-mono"
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.account_number || a.id} · {a.plan_name}
                </option>
              ))}
            </select>
          )}
          <StatusPill status={activeAccount.status || "Active"} />
        </div>
      </PageHead>

      <div className="card-panel p-6 md:p-8 eval-hero">
        <div className="ring" style={{ "--p": progress }}>
          <span className="font-display tabular-nums">{progress}%</span>
          <small>of target</small>
        </div>
        <div className="grid sm:grid-cols-3 gap-4 flex-1">
          <Kpi label={`Profit target (${targetPct}%)`} value={inr(targetAmt)} icon={Target} />
          <Kpi label="Current P&L" value={signed(pnl)} tone={pnlCls(pnl)} icon={TrendingUp} />
          <Kpi label="Remaining target" value={inr(remainingTarget)} icon={Target} />
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4 mt-6">
        <Meter
          label="Trading days"
          value={daysDone}
          max={minDays}
          money={false}
          warnAt={2}
          sub={`${Math.max(0, minDays - daysDone)} more days needed`}
        />
        <Meter
          label="Days elapsed"
          value={daysElapsed}
          max={totalDays}
          money={false}
          sub={`${Math.max(0, totalDays - daysElapsed)} days remaining`}
        />
        <Kpi
          label="Win accuracy"
          value={`${actualAccuracy}%`}
          sub={`Target benchmark ${targetAccuracy}% · ${trades.length} closed trades`}
          icon={BadgeCheck}
        />
      </div>

      <h2 className="font-display text-xl mt-8 mb-4">Challenge limits &amp; rules</h2>
      <div className="grid md:grid-cols-3 gap-4">
        <Meter
          label={`Daily loss used (${dailyLossPct}%)`}
          value={dailyLossUsed}
          max={dailyLimit}
          sub={`${inr(Math.max(0, dailyLimit - dailyLossUsed))} allowance left today`}
        />
        <Meter
          label={`Overall drawdown (${maxLossPct}%)`}
          value={ddUsed}
          max={overallLimit}
          sub={`${inr(Math.max(0, overallLimit - ddUsed))} buffer remaining`}
        />
        <Meter
          label="Trades today"
          value={tradesToday}
          max={maxTrades}
          money={false}
          sub={`${Math.max(0, maxTrades - tradesToday)} executions left today`}
        />
      </div>
    </div>
  );
}

/* ---------- Risk (Admin-controlled limits + live usage) ---------- */
export function RiskManagement() {
  const { activeAccount, accounts, evaluationRisk, orders, trades, selectAccount, loading } =
    useTraderState({ pollMs: 8000 });

  if (loading && !activeAccount) {
    return (
      <div className="card-panel p-8 text-center text-[var(--muted)]">Loading risk status…</div>
    );
  }

  if (!activeAccount) {
    return (
      <div>
        <PageHead
          title="Risk management"
          sub="Daily loss, max drawdown, and per-day trade limits configured by admin."
        />
        <NoAccountCta
          title="No active account to monitor"
          message="Risk rules apply automatically once your challenge or funded account is active."
        />
      </div>
    );
  }

  const cap = Number(activeAccount.starting_capital || 0);
  const bal = Number(activeAccount.balance || 0);
  const maxLossPct = Number(activeAccount.max_loss_limit ?? evaluationRisk.max_loss_limit ?? 20);
  const dailyLossPct = Number(
    activeAccount.daily_loss_limit_pct ?? evaluationRisk.daily_loss_limit_pct ?? 5,
  );
  const overallLimit = Math.round((cap * maxLossPct) / 100);
  const dailyLimit = Math.round((cap * dailyLossPct) / 100);
  const ddUsed = Math.max(0, Math.round(cap - bal));
  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRealized = trades
    .filter((t) => String(t.created_at || t.out || "").startsWith(todayStr))
    .reduce((s, t) => s + Number(t.pnl || 0), 0);
  const dailyLossUsed = Math.min(dailyLimit, Math.max(0, Math.round(-todayRealized)));
  const tradesToday = orders.filter((o) => String(o.created_at || "").startsWith(todayStr)).length;
  const maxTrades = Number(activeAccount.trades_per_day ?? evaluationRisk.trades_per_day ?? 5);

  const drawdownPct = cap > 0 ? +((ddUsed / cap) * 100).toFixed(2) : 0;
  const rules = [
    {
      t: `Daily loss within ${dailyLossPct}% limit (${inr(dailyLimit)})`,
      ok: dailyLossUsed < dailyLimit,
    },
    {
      t: `Overall drawdown within ${maxLossPct}% limit (${inr(overallLimit)})`,
      ok: ddUsed < overallLimit,
    },
    {
      t: `Trades per day within limit (${tradesToday} / ${maxTrades})`,
      ok: tradesToday <= maxTrades,
    },
    { t: "Available margin positive", ok: Number(activeAccount.available_margin ?? bal) >= 0 },
  ];

  return (
    <div>
      <PageHead
        title="Risk management"
        sub={`${activeAccount.plan_name} · ${activeAccount.account_number || activeAccount.id} — rules enforced live across every order.`}
      >
        {accounts.length > 1 && (
          <select
            value={activeAccount.id}
            onChange={(e) => selectAccount(e.target.value)}
            className="input-dark !w-auto !py-1.5 !px-3 text-xs font-mono"
          >
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.account_number || a.id} · {a.plan_name}
              </option>
            ))}
          </select>
        )}
      </PageHead>

      <div className="grid md:grid-cols-2 gap-4">
        <Meter
          label={`Daily loss used (${dailyLossPct}%)`}
          value={dailyLossUsed}
          max={dailyLimit}
          sub={`${inr(Math.max(0, dailyLimit - dailyLossUsed))} left today`}
        />
        <Meter
          label={`Overall drawdown (${maxLossPct}%)`}
          value={ddUsed}
          max={overallLimit}
          sub={`${inr(Math.max(0, overallLimit - ddUsed))} remaining · ${drawdownPct}% drawdown`}
        />
        <Meter
          label="Trades today"
          value={tradesToday}
          max={maxTrades}
          money={false}
          sub={`${Math.max(0, maxTrades - tradesToday)} trades left today`}
        />
        <div className="card-panel p-5">
          <div className="text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono mb-3">
            Rule compliance
          </div>
          <ul className="space-y-2 text-sm">
            {rules.map((r) => (
              <li key={r.t} className="flex items-center gap-2">
                {r.ok ? (
                  <CheckCircle2 size={16} className="text-[var(--emerald)] shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-[var(--rose)] shrink-0" />
                )}
                <span>{r.t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/* ---------- Calendar (real trades aggregated strictly on days traded) ---------- */
function toLocalDateKey(value) {
  if (!value) return "";
  const raw = String(value);
  const ts = Date.parse(raw);
  if (!Number.isNaN(ts)) {
    const d = new Date(ts);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  return raw.slice(0, 10);
}

export function TradingCalendar() {
  const { trades, orders } = useTraderState({ pollMs: 10000 });
  const now = new Date();
  const [cursor, setCursor] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selectedKey, setSelectedKey] = useState("");
  const { year, month } = cursor;
  const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const activityByDate = useMemo(() => {
    const map = {};
    for (const o of orders) {
      if (String(o.status || "").toLowerCase() === "cancelled") continue;
      const key = toLocalDateKey(o.date || o.created_at);
      if (!key) continue;
      if (!map[key]) map[key] = { pnl: 0, closedCount: 0, orderCount: 0, orders: [], trades: [] };
      map[key].orderCount += 1;
      map[key].orders.push(o);
    }
    for (const t of trades) {
      const key = toLocalDateKey(t.out || t.created_at || t.in);
      if (!key) continue;
      if (!map[key]) map[key] = { pnl: 0, closedCount: 0, orderCount: 0, orders: [], trades: [] };
      map[key].pnl += Number(t.pnl || 0);
      map[key].closedCount += 1;
      map[key].trades.push(t);
    }
    return map;
  }, [trades, orders]);

  const days = useMemo(() => {
    const totalDays = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: totalDays }, (_, i) => {
      const day = i + 1;
      const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const info = activityByDate[key];
      if (!info) return { day, key, traded: false, pnl: null, count: 0 };
      return {
        day,
        key,
        traded: true,
        pnl: Math.round(info.pnl),
        count: info.closedCount || info.orderCount,
        info,
      };
    });
  }, [year, month, activityByDate]);

  const lead = new Date(year, month, 1).getDay();
  const tradedDays = days.filter((d) => d.traded);
  const total = tradedDays.reduce((s, d) => s + (d.pnl || 0), 0);
  const selectedDay = days.find((d) => d.key === selectedKey && d.traded);

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
    setSelectedKey("");
  };

  return (
    <div>
      <PageHead
        title="Trading calendar"
        sub="Click any highlighted trading day to inspect orders, P&L, and trade notes."
      >
        <div className="flex items-center gap-2">
          <button
            className="btn-ghost rounded-full p-2"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="font-display text-lg w-44 text-center">
            {new Date(year, month, 1).toLocaleString("en-IN", { month: "long", year: "numeric" })}
          </div>
          <button
            className="btn-ghost rounded-full p-2"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </PageHead>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Kpi
          label="Profitable days"
          value={tradedDays.filter((d) => d.pnl > 0).length}
          tone="text-[var(--emerald)]"
          icon={TrendingUp}
        />
        <Kpi
          label="Losing days"
          value={tradedDays.filter((d) => d.pnl < 0).length}
          tone="text-[var(--rose)]"
        />
        <Kpi label="Traded days" value={tradedDays.length} icon={CalendarDays} />
        <Kpi label="Month P&L" value={signed(total)} tone={pnlCls(total)} icon={Wallet} />
      </div>
      <div className="card-panel p-4 md:p-5">
        <div className="cal-grid" data-testid="trading-calendar-grid">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
            <div key={d} className="cal-head">
              {d}
            </div>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <div key={`e${i}`} />
          ))}
          {days.map((d) => {
            const isToday = d.key === todayKey;
            const isSelected = d.key === selectedKey;
            return (
              <button
                type="button"
                key={d.day}
                disabled={!d.traded}
                onClick={() => d.traded && setSelectedKey(d.key === selectedKey ? "" : d.key)}
                className={`cal-day text-left transition ${
                  !d.traded ? "is-off" : d.pnl > 0 ? "is-up" : d.pnl < 0 ? "is-down" : "is-flat"
                } ${isToday ? "ring-1 ring-[var(--accent)]" : ""} ${isSelected ? "ring-2 ring-white" : ""}`}
                data-traded={d.traded ? "true" : "false"}
              >
                <span className="flex items-center justify-between w-full font-mono text-[11px]">
                  <span>{d.day}</span>
                  {d.traded && <span className="text-[9px] opacity-70">{d.count}x</span>}
                </span>
                {d.traded && (
                  <strong>
                    {d.pnl === 0
                      ? `${d.count} ${d.count === 1 ? "trade" : "trades"}`
                      : `${d.pnl > 0 ? "+" : "−"}${Math.abs(d.pnl).toLocaleString("en-IN")}`}
                  </strong>
                )}
              </button>
            );
          })}
        </div>
      </div>
      {selectedDay?.info && (
        <div className="card-panel p-5 mt-5">
          <div className="flex items-center justify-between gap-3 mb-3">
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-[var(--muted-2)]">
                Activity for {selectedDay.key}
              </div>
              <div className={`font-display text-xl mt-0.5 ${pnlCls(selectedDay.pnl || 0)}`}>
                {signed(selectedDay.pnl || 0)}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSelectedKey("")}
              className="btn-ghost rounded-full px-3 py-1 text-xs"
            >
              Close
            </button>
          </div>
          <div className="space-y-2 text-xs">
            {selectedDay.info.orders.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg bg-[var(--bg-1)] border border-[var(--border)]"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-semibold ${o.side === "BUY" ? "text-[var(--emerald)]" : "text-[var(--rose)]"}`}
                  >
                    {o.side}
                  </span>
                  <span className="font-mono text-white">{o.symbol}</span>
                  <span className="text-[var(--muted-2)]">× {o.qty}</span>
                  {o.note && <span className="text-[var(--emerald)]">· {o.note}</span>}
                </div>
                <span className="font-mono text-[var(--muted)]">@ {formatPrice(o.price)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {tradedDays.length === 0 && (
        <p className="text-xs text-[var(--muted-2)] mt-4 text-center">
          No trades executed this month yet — P&amp;L highlights appear only on days you trade.
        </p>
      )}
    </div>
  );
}

/* ---------- Funded account ---------- */
export function FundedAccount() {
  const { accounts, evaluationRisk, loading } = useTraderState({ pollMs: 6000 });
  const liveFunded = accounts.find((a) => a.status === "Funded" || a.account_type === "Funded");

  if (loading && !accounts.length) {
    return <div className="card-panel p-8 text-center text-[var(--muted)]">Loading…</div>;
  }

  if (!liveFunded) {
    return (
      <div>
        <PageHead title="Funded account" sub="Live capital payout and split details." />
        <NoAccountCta
          title="No funded account yet"
          message="Pass your evaluation challenge or go directly for a funded account to unlock profit splits and payouts."
        />
      </div>
    );
  }

  const size = Number(liveFunded.starting_capital || 0);
  const bal = Number(liveFunded.balance || 0);
  const pnl = Number(liveFunded.realized_pnl || 0);
  const profitSplit = Number(liveFunded.profit_split ?? evaluationRisk.profit_split ?? 70);
  const maxLossPct = Number(liveFunded.max_loss_limit ?? evaluationRisk.max_loss_limit ?? 20);
  const lossLimit = Math.round((size * maxLossPct) / 100);
  const start = String(liveFunded.created_at || "").slice(0, 10) || "Active";
  const share = Math.max(0, pnl) * (profitSplit / 100);

  return (
    <div>
      <PageHead
        title="Funded account"
        sub={`${liveFunded.account_number || liveFunded.id} · started ${start}`}
      >
        <StatusPill status={liveFunded.status || "Funded"} />
      </PageHead>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Kpi label="Account size" value={inr(size)} icon={Wallet} />
        <Kpi label="Balance" value={inr(bal)} icon={Wallet} />
        <Kpi label="P&L" value={signed(pnl)} tone={pnlCls(pnl)} icon={TrendingUp} />
        <Kpi label="Profit split" value={`${profitSplit}%`} icon={BadgeCheck} />
        <Kpi
          label={`Overall loss limit (${maxLossPct}%)`}
          value={inr(lossLimit)}
          icon={ShieldAlert}
        />
        <Kpi
          label="Your share (if paid now)"
          value={inr(share)}
          tone="text-[var(--emerald)]"
          icon={Wallet}
        />
      </div>
      <div className="card-panel p-6 mt-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="font-display text-xl">Ready to withdraw?</div>
          <p className="text-sm text-[var(--muted)] mt-1">
            Payouts are processed after KYC verification.
          </p>
        </div>
        <Link to="/app/payouts" className="btn-amber rounded-full px-5 py-2.5 text-sm">
          Request payout
        </Link>
      </div>
    </div>
  );
}

/* ---------- KYC (Real submission to /me/kyc) ---------- */
export function Kyc() {
  const { user, refresh } = useAuth();
  const [form, setForm] = useState({ aadhaar: "", pan: "", bank: "", ifsc: "", holder: "" });
  const [files, setFiles] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const k = user?.kyc;
    if (k && typeof k === "object") {
      setForm({
        aadhaar: k.aadhaar || "",
        pan: k.pan || "",
        bank: k.bank_account_number || "",
        ifsc: k.ifsc || "",
        holder: k.full_name || user?.name || "",
      });
    } else if (user?.name) {
      setForm((prev) => ({ ...prev, holder: prev.holder || user.name }));
    }
  }, [user]);

  const rawStatus = String(user?.kyc?.status || "").toLowerCase();
  const status =
    rawStatus === "verified" || rawStatus === "approved"
      ? "Verified"
      : rawStatus === "submitted" || rawStatus === "under review"
        ? "Under review"
        : "Not submitted";

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const docs = [
    ["aadhaar_doc", "Aadhaar (front & back)"],
    ["pan_doc", "PAN card"],
    ["bank_doc", "Cancelled cheque / bank statement"],
  ];
  const valid =
    /^\d{12}$/.test(form.aadhaar.replace(/\s/g, "")) &&
    /^[A-Z]{5}\d{4}[A-Z]$/.test(form.pan.toUpperCase()) &&
    form.bank.length >= 6 &&
    /^[A-Z]{4}0[A-Z0-9]{6}$/.test(form.ifsc.toUpperCase()) &&
    form.holder.trim();

  const submit = async (e) => {
    e.preventDefault();
    if (!valid)
      return toast.error(
        "Please check the Aadhaar (12 digits), PAN (ABCDE1234F), account number and IFSC.",
      );
    setSaving(true);
    try {
      await api.put("/me/kyc", {
        full_name: form.holder.trim(),
        aadhaar: form.aadhaar.replace(/\s/g, ""),
        pan: form.pan.toUpperCase().trim(),
        bank_account_number: form.bank.trim(),
        ifsc: form.ifsc.toUpperCase().trim(),
      });
      await refresh();
      toast.success("KYC details saved and submitted for verification.");
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not submit KYC"));
    } finally {
      setSaving(false);
    }
  };

  const steps = [
    ["Submitted", status !== "Not submitted"],
    ["Under review", status === "Under review" || status === "Verified"],
    ["Verified", status === "Verified"],
  ];

  return (
    <div>
      <PageHead
        title="KYC verification"
        sub="Required before your first payout. Your PAN and bank details are encrypted and saved to your trader profile."
      >
        <StatusPill status={status} />
      </PageHead>
      <div className="kyc-steps mb-6">
        {steps.map(([t, on], i) => (
          <div key={t} className={on ? "is-on" : ""}>
            <span>{on ? <CheckCircle2 size={16} /> : i + 1}</span>
            {t}
          </div>
        ))}
      </div>
      <form onSubmit={submit} className="grid lg:grid-cols-2 gap-6">
        <div className="card-panel p-6 space-y-4">
          <div className="font-display text-lg">Identity & bank details</div>
          {[
            ["aadhaar", "Aadhaar number", "123456789012"],
            ["pan", "PAN", "ABCDE1234F"],
            ["holder", "Account holder name", "As per bank"],
            ["bank", "Bank account number", ""],
            ["ifsc", "IFSC", "SBIN0001234"],
          ].map(([k, l, ph]) => (
            <div key={k}>
              <label className="dash-label" htmlFor={`kyc-${k}`}>
                {l}
              </label>
              <input
                id={`kyc-${k}`}
                className="input-dark"
                placeholder={ph}
                value={form[k]}
                onChange={set(k)}
                maxLength={k === "aadhaar" ? 14 : 34}
                autoComplete="off"
              />
            </div>
          ))}
        </div>
        <div className="card-panel p-6 space-y-4">
          <div className="font-display text-lg">Supporting documents (optional quick check)</div>
          {docs.map(([k, l]) => (
            <label key={k} className={`upload-box ${files[k] ? "has-file" : ""}`}>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="sr-only"
                onChange={(e) => setFiles({ ...files, [k]: e.target.files?.[0]?.name })}
              />
              {files[k] ? <CheckCircle2 size={18} /> : <Upload size={18} />}
              <div>
                <strong>{l}</strong>
                <small>{files[k] || "JPG, PNG or PDF"}</small>
              </div>
            </label>
          ))}
          <button
            type="submit"
            className="btn-amber rounded-full w-full py-3 text-sm disabled:opacity-50"
            disabled={saving}
          >
            {saving
              ? "Saving…"
              : status === "Verified"
                ? "Verified"
                : status === "Under review"
                  ? "Update & resubmit KYC"
                  : "Submit for verification"}
          </button>
        </div>
      </form>
    </div>
  );
}

/* ---------- Notifications (real /me/notifications + live account alerts) ---------- */
export function Notifications() {
  const { activeAccount, hasActiveAccount, kyc } = useTraderState({ pollMs: 12000 });
  const [serverList, setServerList] = useState([]);
  const [dismissedLive, setDismissedLive] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    api
      .get("/me/notifications")
      .then((r) => {
        setServerList(Array.isArray(r.data) ? r.data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const liveNotices = useMemo(() => {
    const out = [];
    if (!hasActiveAccount) {
      out.push({
        id: "live-no-plan",
        type: "progress",
        title: "No active trading plan",
        body: "Your simulated capital is ₹0. Purchase a challenge plan to start trading.",
        time: "Current status",
        read: dismissedLive.includes("live-no-plan"),
        virtual: true,
      });
    }
    if (activeAccount && Number(activeAccount.starting_capital || 0) > 0) {
      const dd = Math.max(
        0,
        Number(activeAccount.starting_capital) - Number(activeAccount.balance || 0),
      );
      const maxLossAmt =
        (Number(activeAccount.starting_capital) * Number(activeAccount.max_loss_limit || 20)) / 100;
      if (maxLossAmt > 0 && dd / maxLossAmt >= 0.7) {
        out.push({
          id: "live-dd-warn",
          type: "risk",
          title: "Drawdown limit warning",
          body: `Account ${activeAccount.account_number || activeAccount.id} has used ${Math.round((dd / maxLossAmt) * 100)}% of overall drawdown allowance.`,
          time: "Live alert",
          read: dismissedLive.includes("live-dd-warn"),
          virtual: true,
        });
      }
    }
    if (!kyc?.status) {
      out.push({
        id: "live-kyc",
        type: "kyc",
        title: "Complete KYC verification",
        body: "Submit PAN and bank details in the KYC tab before requesting your first payout.",
        time: "Account checklist",
        read: dismissedLive.includes("live-kyc"),
        virtual: true,
      });
    }
    return out;
  }, [hasActiveAccount, activeAccount, kyc, dismissedLive]);

  const items = [...serverList, ...liveNotices];
  const icon = {
    risk: ShieldAlert,
    trade: Activity,
    progress: Target,
    kyc: BadgeCheck,
    payout: Wallet,
  };

  const markOne = async (n) => {
    if (n.read) return;
    if (n.virtual) {
      setDismissedLive((prev) => [...prev, n.id]);
      return;
    }
    await api.post("/me/notifications/read", { id: n.id }).catch(() => {});
    setServerList((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
  };

  const markAll = async () => {
    setDismissedLive(liveNotices.map((n) => n.id));
    await api.post("/me/notifications/read", {}).catch(() => {});
    setServerList((prev) => prev.map((x) => ({ ...x, read: true })));
  };

  return (
    <div>
      <PageHead title="Notifications" sub="Account credits, risk alerts, and verification updates.">
        <button className="btn-ghost rounded-full px-4 py-2 text-xs" onClick={markAll}>
          Mark all read
        </button>
      </PageHead>
      {!loaded ? (
        <div className="card-panel p-8 text-center text-[var(--muted)]">Loading notifications…</div>
      ) : items.length ? (
        <ul className="space-y-3">
          {items.map((n) => {
            const Icon = icon[n.type || n.kind] || Bell;
            const unread = !n.read;
            return (
              <li
                key={n.id}
                className={`card-panel p-4 flex gap-4 items-start notif cursor-pointer ${unread ? "is-unread" : ""}`}
                onClick={() => markOne(n)}
              >
                <span className="notif-icon">
                  <Icon size={17} />
                </span>
                <div className="flex-1">
                  <div className="flex justify-between gap-3">
                    <strong className="text-sm">{n.title || n.t}</strong>
                    <small className="text-[var(--muted-2)]">{n.time}</small>
                  </div>
                  <p className="text-sm text-[var(--muted)] mt-1">{n.body || n.d}</p>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="card-panel p-8 text-center text-sm text-[var(--muted)]">
          No notifications right now.
        </div>
      )}
    </div>
  );
}

/* ---------- Support (real /me/tickets) ---------- */
export function Support() {
  const [tickets, setTickets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ subject: "", category: "Account", message: "" });

  const load = useCallback(() => {
    api
      .get("/me/tickets")
      .then((r) => {
        setTickets(Array.isArray(r.data) ? r.data : []);
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submit = async (e) => {
    e.preventDefault();
    if (form.subject.trim().length < 4 || form.message.trim().length < 10)
      return toast.error("Please add a subject (min 4 chars) and description (min 10 chars).");
    setSubmitting(true);
    try {
      const { data } = await api.post("/me/tickets", form);
      setTickets((prev) => [data, ...prev]);
      setForm({ subject: "", category: "Account", message: "" });
      toast.success(`Support ticket ${data.id} submitted.`);
    } catch (err) {
      toast.error(formatApiError(err?.response?.data?.detail, "Could not create ticket"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <PageHead title="Support" sub="Raise a support ticket tied to your account." />
      <div className="grid lg:grid-cols-[1fr_1.2fr] gap-6">
        <form onSubmit={submit} className="card-panel p-6 space-y-4">
          <div className="font-display text-lg flex items-center gap-2">
            <LifeBuoy size={18} /> New ticket
          </div>
          <div>
            <label className="dash-label" htmlFor="tk-cat">
              Category
            </label>
            <select
              id="tk-cat"
              className="input-dark"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
            >
              {["Account", "Trading", "Payouts", "KYC", "Other"].map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="dash-label" htmlFor="tk-sub">
              Subject
            </label>
            <input
              id="tk-sub"
              className="input-dark"
              maxLength={120}
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            />
          </div>
          <div>
            <label className="dash-label" htmlFor="tk-msg">
              Message
            </label>
            <textarea
              id="tk-msg"
              rows={5}
              className="input-dark"
              maxLength={2000}
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </div>
          <button
            disabled={submitting}
            className="btn-amber rounded-full w-full py-3 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Send size={15} /> {submitting ? "Submitting…" : "Submit ticket"}
          </button>
        </form>
        <div>
          <h2 className="font-display text-xl mb-3">Your tickets</h2>
          <Table
            rows={loaded ? tickets : []}
            empty={loaded ? "No support tickets submitted yet." : "Loading tickets…"}
            cols={[
              {
                k: "id",
                label: "Ticket",
                render: (r) => <span className="font-mono text-xs">{r.id}</span>,
              },
              { k: "subject", label: "Subject" },
              { k: "date", label: "Date" },
              { k: "status", label: "Status", render: (r) => <StatusPill status={r.status} /> },
            ]}
          />
        </div>
      </div>
    </div>
  );
}

/* ---------- Real Trading Overview (no sample fallback) ---------- */
export function TradingOverview() {
  const { activeAccount, evaluationRisk, trades } = useTraderState({ pollMs: 8000 });
  const cap = Number(activeAccount?.starting_capital || 0);
  const bal = Number(activeAccount?.balance || 0);

  const curve = useMemo(() => {
    const chrono = [...trades].reverse();
    let v = cap;
    const series = [v];
    for (const t of chrono) {
      v += Number(t.pnl || 0);
      series.push(v);
    }
    if (series.length === 1) series.push(bal);
    return series;
  }, [trades, cap, bal]);

  if (!activeAccount) return null;

  const pnl = +(bal - cap).toFixed(2);
  const targetPct = Number(
    activeAccount.profit_target_pct ?? evaluationRisk.profit_target_pct ?? 8,
  );
  const targetAmt = Math.round((cap * targetPct) / 100);
  const progress =
    targetAmt > 0 ? Math.max(0, Math.min(100, Math.round((pnl / targetAmt) * 100))) : 0;
  const minDays = Number(activeAccount.min_trading_days ?? evaluationRisk.min_trading_days ?? 10);
  const daysDone =
    activeAccount.trading_days_done != null
      ? Number(activeAccount.trading_days_done)
      : new Set(trades.map((t) => String(t.created_at || t.out || "").slice(0, 10)).filter(Boolean))
          .size;
  const ddUsed = Math.max(0, cap - bal);
  const drawdownPct = cap > 0 ? +((ddUsed / cap) * 100).toFixed(2) : 0;

  const lo = Math.min(...curve);
  const hi = Math.max(...curve);
  const pts = curve
    .map(
      (v, i) =>
        `${(i / Math.max(1, curve.length - 1)) * 600},${150 - ((v - lo) / (hi - lo || 1)) * 140}`,
    )
    .join(" ");

  return (
    <section className="mt-12">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <h2 className="font-display text-2xl">Trading overview</h2>
        <span className="text-xs text-[var(--muted-2)] font-mono">
          Account {activeAccount.account_number || activeAccount.id}
        </span>
      </div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Kpi label="Starting capital" value={inr(cap)} />
        <Kpi label="Balance" value={inr(bal)} />
        <Kpi label="Available margin" value={inr(activeAccount.available_margin ?? bal)} />
        <Kpi label="Total P&L" value={signed(pnl)} tone={pnlCls(pnl)} />
        <Kpi
          label="Realized P&L"
          value={signed(activeAccount.realized_pnl || 0)}
          tone={pnlCls(activeAccount.realized_pnl || 0)}
        />
        <Kpi label="Drawdown" value={`${drawdownPct}%`} />
        <Kpi label="Trading days" value={`${daysDone} / ${minDays}`} icon={CalendarDays} />
        <Kpi label="Target progress" value={`${progress}%`} icon={Target} />
      </div>
      <div className="grid lg:grid-cols-[1.4fr_1fr] gap-6 mt-6">
        <div className="card-panel p-5">
          <div className="text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono mb-3">
            Real equity trajectory
          </div>
          <svg
            viewBox="0 0 600 160"
            className="w-full h-auto equity-svg"
            role="img"
            aria-label="Equity curve"
          >
            <polyline points={pts} />
            <polygon points={`0,160 ${pts} 600,160`} />
          </svg>
        </div>
        <div className="card-panel p-5">
          <div className="text-xs text-[var(--muted-2)] uppercase tracking-wider font-mono mb-3">
            Recent trades
          </div>
          {trades.length ? (
            <ul className="space-y-2 text-sm tabular-nums">
              {trades.slice(0, 5).map((t) => (
                <li key={t.id} className="flex justify-between gap-3">
                  <span>
                    {t.side === "BUY" ? "▲" : "▼"} {t.symbol}{" "}
                    <small className="text-[var(--muted-2)]">
                      {String(t.in || "")
                        .slice(5, 16)
                        .replace("T", " ")}
                    </small>
                  </span>
                  <span className={pnlCls(t.pnl)}>{signed(t.pnl)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[var(--muted)]">
              Place your first trade in the terminal to build history.
            </p>
          )}
          <Link
            to="/app/tradebook"
            className="text-xs text-[var(--accent)] mt-4 inline-block hover:underline"
          >
            Open trade book →
          </Link>
        </div>
      </div>
    </section>
  );
}
