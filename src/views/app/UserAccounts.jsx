import { StatusPill } from "./TraderScreens";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@/lib/router-compat";
import { api, formatINR } from "../../lib/api";
import {
  ArrowRight,
  Rocket,
  CandlestickChart,
  ShieldCheck,
  Wallet,
  TrendingUp,
  Briefcase,
  Target,
} from "lucide-react";

export default function UserAccounts() {
  const [traderAccounts, setTraderAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(() => {
    api
      .get("/me/accounts")
      .then((r) => {
        const d = r.data;
        if (Array.isArray(d)) {
          setOrders(d);
        } else {
          setTraderAccounts(d?.accounts || []);
          setOrders(d?.orders || []);
        }
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  useEffect(() => {
    load();
    const id = setInterval(() => {
      if (!document.hidden) load();
    }, 6000);
    return () => clearInterval(id);
  }, [load]);

  const summary = useMemo(() => {
    const totalCap = traderAccounts.reduce((s, a) => s + Number(a.starting_capital || 0), 0);
    const totalBal = traderAccounts.reduce((s, a) => s + Number(a.balance || 0), 0);
    const totalPnl = traderAccounts.reduce((s, a) => s + Number(a.realized_pnl || 0), 0);
    return { totalCap, totalBal, totalPnl, count: traderAccounts.length };
  }, [traderAccounts]);

  const statusBadge = (s) => {
    const map = {
      pending_payment: { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Awaiting payment" },
      pending_verification: { bg: "rgba(245,182,56,0.15)", text: "#ffd166", label: "Pending" },
      completed: { bg: "rgba(41,211,154,0.15)", text: "#29d39a", label: "Active" },
      rejected: { bg: "rgba(255,85,116,0.15)", text: "#ff5574", label: "Rejected" },
    };
    const m = map[s] || map.pending_verification;
    return (
      <span
        className="text-[10px] font-mono uppercase tracking-wider px-2.5 py-1 rounded-full"
        style={{ background: m.bg, color: m.text }}
      >
        {m.label}
      </span>
    );
  };

  return (
    <div>
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-3xl md:text-4xl">My accounts</h1>
          <p className="text-sm text-[var(--muted)] mt-2">
            Active challenge &amp; funded accounts provisioned from your plan purchases and admin
            allocations.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            to="/app/terminal"
            className="btn-ghost rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            <CandlestickChart size={14} /> Open terminal
          </Link>
          <Link
            to="/challenges"
            className="btn-amber rounded-full px-5 py-2.5 text-sm inline-flex items-center gap-2"
          >
            Go for a funded account <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      {!loaded ? (
        <div className="card-panel p-8 mt-8 text-center text-[var(--muted)]">Loading accounts…</div>
      ) : traderAccounts.length || orders.length ? (
        <div className="space-y-8 mt-8">
          {traderAccounts.length > 0 && (
            <>
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 tabular-nums">
                <div className="card-panel p-5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
                    <span>Active accounts</span>
                    <Briefcase size={14} className="text-[var(--accent)]" />
                  </div>
                  <div className="font-display text-2xl md:text-3xl mt-3">{summary.count}</div>
                  <div className="text-xs text-[var(--muted-2)] mt-1">Challenge &amp; funded</div>
                </div>
                <div className="card-panel p-5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
                    <span>Total allocation</span>
                    <ShieldCheck size={14} className="text-[var(--emerald)]" />
                  </div>
                  <div className="font-display text-2xl md:text-3xl mt-3">
                    {formatINR(summary.totalCap)}
                  </div>
                  <div className="text-xs text-[var(--muted-2)] mt-1">Starting capital</div>
                </div>
                <div className="card-panel p-5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
                    <span>Current equity</span>
                    <Wallet size={14} className="text-[var(--accent)]" />
                  </div>
                  <div className="font-display text-2xl md:text-3xl mt-3">
                    {formatINR(summary.totalBal)}
                  </div>
                  <div className="text-xs text-[var(--muted-2)] mt-1">Combined balance</div>
                </div>
                <div className="card-panel p-5">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
                    <span>Net realized P&amp;L</span>
                    <TrendingUp size={14} className="text-[var(--emerald)]" />
                  </div>
                  <div
                    className={`font-display text-2xl md:text-3xl mt-3 ${
                      summary.totalPnl >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]"
                    }`}
                  >
                    {summary.totalPnl >= 0 ? "+" : "−"}
                    {formatINR(Math.abs(summary.totalPnl))}
                  </div>
                  <div className="text-xs text-[var(--muted-2)] mt-1">Across all wallets</div>
                </div>
              </div>

              <section>
                <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={16} className="text-[var(--emerald)]" />
                    <h2 className="font-display text-xl">
                      Trading accounts ({traderAccounts.length})
                    </h2>
                  </div>
                  <Link
                    to="/app/evaluation"
                    className="text-xs text-[var(--accent-hi)] hover:underline inline-flex items-center gap-1"
                  >
                    <Target size={13} /> View evaluation progress
                  </Link>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {traderAccounts.map((a, i) => {
                    const cap = Number(a.starting_capital || 0);
                    const bal = Number(a.balance || 0);
                    const pnl = Number(a.realized_pnl || 0);
                    const targetPct = Number(a.profit_target_pct ?? 8);
                    const targetAmt = (cap * targetPct) / 100;
                    const netDiff = bal - cap;
                    const targetProgress =
                      targetAmt > 0
                        ? Math.max(0, Math.min(100, Math.round((netDiff / targetAmt) * 100)))
                        : 0;
                    return (
                      <div
                        key={a.id || i}
                        className="card-panel p-6 acct-card flex flex-col justify-between gap-4"
                        data-testid={`user-account-${i}`}
                      >
                        <div>
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
                                {a.account_number || a.id} · {a.account_type || "Challenge"}
                              </div>
                              <div className="font-display text-2xl mt-1 text-white">
                                {a.plan_name}
                              </div>
                            </div>
                            <StatusPill status={a.status || "Active"} />
                          </div>

                          <div className="mt-4 pt-3 border-t border-[var(--border)]">
                            <div className="flex items-center justify-between text-[11px] font-mono text-[var(--muted-2)] mb-1.5">
                              <span>Target progress ({targetPct}%)</span>
                              <span className="text-white">{targetProgress}%</span>
                            </div>
                            <div className="meter is-ok !mt-0">
                              <i style={{ width: `${targetProgress}%` }} />
                            </div>
                          </div>

                          <dl className="acct-meta tabular-nums">
                            <div>
                              <dt>Capital</dt>
                              <dd className="text-white font-medium">{formatINR(cap)}</dd>
                            </div>
                            <div>
                              <dt>Balance</dt>
                              <dd className="text-white font-medium">{formatINR(bal)}</dd>
                            </div>
                            <div>
                              <dt>Realized P&amp;L</dt>
                              <dd
                                className={`font-medium ${
                                  pnl >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]"
                                }`}
                              >
                                {pnl >= 0 ? "+" : "−"}
                                {formatINR(Math.abs(pnl))}
                              </dd>
                            </div>
                            <div>
                              <dt>Profit target</dt>
                              <dd>{targetPct}%</dd>
                            </div>
                            <div>
                              <dt>Profit split</dt>
                              <dd className="text-[var(--emerald)]">{a.profit_split || 70}%</dd>
                            </div>
                            <div>
                              <dt>Max drawdown</dt>
                              <dd>{a.max_loss_limit || 20}%</dd>
                            </div>
                          </dl>
                          {a.note && (
                            <div className="text-xs text-[var(--muted)] mt-3 bg-white/[0.02] border border-[var(--border)] rounded-lg px-3 py-2">
                              {a.note}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-3 pt-3 border-t border-[var(--border)]">
                          <span className="text-[11px] font-mono text-[var(--muted-2)]">
                            Daily loss limit {a.daily_loss_limit_pct ?? 5}%
                          </span>
                          <Link
                            to="/app/terminal"
                            className="btn-ghost rounded-full px-4 py-1.5 text-xs inline-flex items-center gap-1.5"
                          >
                            <CandlestickChart size={13} /> Trade now
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            </>
          )}

          {orders.length > 0 && (
            <section>
              <h2 className="font-display text-xl mb-4">Challenge purchases ({orders.length})</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {orders.map((o, i) => (
                  <div key={o.id || i} className="card-panel p-6" data-testid={`user-order-${i}`}>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
                          Plan order
                        </div>
                        <div className="font-display text-2xl mt-1">{o.plan_name}</div>
                      </div>
                      <Rocket size={18} className="text-[var(--accent)]" />
                    </div>
                    <div className="mt-4 pt-4 border-t border-[var(--border)] flex items-center justify-between text-xs tabular-nums">
                      <div className="text-[var(--muted)]">
                        Paid <span className="text-white font-mono">{formatINR(o.amount)}</span>
                      </div>
                      {statusBadge(o.status)}
                    </div>
                    <div className="text-[11px] text-[var(--muted-2)] mt-3 font-mono">
                      {new Date(o.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="card-panel p-10 mt-10 text-center" data-testid="accounts-empty-cta">
          <Rocket size={28} className="text-[var(--accent)] mx-auto" />
          <div className="font-display text-2xl mt-4">No purchased accounts yet</div>
          <p className="text-sm text-[var(--muted)] mt-3 max-w-md mx-auto">
            Your simulated capital is currently ₹0. Go for a funded account to unlock your challenge
            wallet and start trading real NSE &amp; BSE prices.
          </p>
          <Link
            to="/challenges"
            className="btn-amber rounded-full px-6 py-3 text-sm mt-6 inline-flex items-center gap-2"
          >
            Go for a funded account <ArrowRight size={14} />
          </Link>
        </div>
      )}
    </div>
  );
}
