import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import {
  ArrowRight,
  LayoutDashboard,
  Briefcase,
  CandlestickChart,
  BookOpen,
  Layers,
  ListOrdered,
  Target,
  CalendarDays,
  Sparkles,
  BadgeCheck,
  IdCard,
  Award,
  Wallet,
  Bell,
  LifeBuoy,
  Settings as SettingsIcon,
  CheckCircle2,
  ShieldCheck,
  Server,
  Circle,
  FileText,
  Gauge,
  Activity,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "../components/ui/accordion";
import { api, formatINR } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { useSettings } from "../context/SettingsContext";
import { useLiveMarketQuotes, formatPrice } from "../lib/useLiveMarket";
import { TradingTerminal } from "./app/TraderScreens";

const GROUPS = [
  { id: "ALL", label: "All 16 Screens" },
  { id: "Trading", label: "Trading (6)" },
  { id: "Performance", label: "Performance (3)" },
  { id: "Funding", label: "Funding (4)" },
  { id: "Account", label: "Account (3)" },
];

const SHOWCASE_SYMBOLS = [
  "NIFTY",
  "BANKNIFTY",
  "SENSEX",
  "FINNIFTY",
  "MIDCPNIFTY",
  "BANKEX",
  "RELIANCE",
  "HDFCBANK",
  "TCS",
  "INFY",
];

const BROKERS = [
  ["Zerodha", "India's largest discount broker with the Kite trading platform."],
  ["Angel One", "Full-service broker with SmartAPI and a mobile-first trading app."],
  ["Upstox", "Fast, low-cost trading with a modern web and mobile experience."],
  ["Dhan", "Trader-focused platform with advanced charts and options tools."],
];

const TRACKER = [
  "Challenge result",
  "KYC verification",
  "Document submission",
  "Platform selection",
  "Account setup",
  "Activation",
];

function buildScreens(er) {
  return [
    {
      key: "overview",
      group: "Trading",
      label: "Overview",
      to: "/app",
      icon: LayoutDashboard,
      tagline: "Command center for real funded capital, margins, net P&L, and fund ledger",
      features: [
        "Starts at ₹0 until you purchase a challenge or receive funded capital",
        "Total active capital, available margin, realized P&L & payouts",
        "Real equity curve plotted strictly from your closed trades",
        "Recent Razorpay purchases & admin fund allocation ledger",
      ],
    },
    {
      key: "accounts",
      group: "Trading",
      label: "My Accounts",
      to: "/app/accounts",
      icon: Briefcase,
      tagline: "Manage every purchased Challenge and Funded trading wallet",
      features: [
        "Displays only accounts you purchased or received from admin",
        "Live balance, available margin, used margin & profit split per wallet",
        "Challenge order history & activation status",
        "One-click launch into any selected trading account",
      ],
    },
    {
      key: "terminal",
      group: "Trading",
      label: "Trading Terminal",
      to: "/app/terminal",
      icon: CandlestickChart,
      tagline: "Execution desk with live NSE/BSE watchlist, candlesticks & order ticket",
      features: [
        "Live NSE & BSE watchlist (NIFTY, BANKNIFTY, SENSEX, equities)",
        "Interactive OHLC candlestick chart across 1m–1D timeframes",
        "MARKET, LIMIT & SL buy/sell ticket protected by active-plan check",
        "Real-time mark-to-market positions & one-tap square off",
      ],
    },
    {
      key: "tradebook",
      group: "Trading",
      label: "Trade Book",
      to: "/app/tradebook",
      icon: BookOpen,
      tagline: "Audit every closed execution with entry, exit, timestamps & realized P&L",
      features: [
        "Complete history of your closed challenge & funded trades",
        "Exact entry/exit prices synced with live NSE/BSE execution quotes",
        "Entry & exit timestamps, trade side, and quantity breakdown",
        "Filter by NIFTY, BANKNIFTY, SENSEX, or equities",
      ],
    },
    {
      key: "positions",
      group: "Trading",
      label: "Positions",
      to: "/app/positions",
      icon: Layers,
      tagline: "Monitor open exposure with live MTM price ticks and instant close",
      features: [
        "Live last traded price (LTP) and unrealized MTM profit/loss",
        "Average entry price, lot/share qty & blocked margin visibility",
        "One-click Market Square Off per open position",
        "Automatic margin release back to account balance on close",
      ],
    },
    {
      key: "orders",
      group: "Trading",
      label: "Orders",
      to: "/app/orders",
      icon: ListOrdered,
      tagline: "Track executed, pending limit, and stop-loss orders across sessions",
      features: [
        "Chronological order blotter synced across devices",
        "Executed, Pending & Cancelled status badges",
        "Order ID, instrument exchange, execution price & timestamp",
        "Server-side daily trade limit & drawdown validation per order",
      ],
    },
    {
      key: "evaluation",
      group: "Performance",
      label: "Evaluation Progress",
      to: "/app/evaluation",
      icon: Target,
      tagline: "Admin-governed rule tracker for challenge completion & pass readiness",
      features: [
        `Profit target (${er.profit_target_pct ?? 8}%) tracked against real account P&L`,
        `Minimum ${er.min_trading_days ?? 10} active trading days out of ${er.total_trading_days ?? 30} days`,
        `Win accuracy benchmark (${er.profit_accuracy_pct ?? 70}%) & trade count`,
        "Rule updates made by admin sync live to your account",
      ],
    },
    {
      key: "calendar",
      group: "Performance",
      label: "Trading Calendar",
      to: "/app/calendar",
      icon: CalendarDays,
      tagline: "Monthly heatmap calculated directly from your executed trades",
      features: [
        "Day-by-day calendar cells showing realized session P&L",
        "Profitable vs losing vs no-trade session counts",
        "Month-by-month navigation across trading history",
        "100% real aggregation from your closed Trade Book",
      ],
    },
    {
      key: "insights",
      group: "Performance",
      label: "AI Insights",
      to: "/app/insights",
      icon: Sparkles,
      tagline: "Analyze your real trade logs for consistency & risk leaks",
      features: [
        "Consistency score out of 100 from your uploaded trade logs",
        "Detects overtrading, premature exits & sizing mistakes",
        "Rule-compliance review tailored to your active challenge plan",
        "Saved review history tied to your trader profile",
      ],
    },
    {
      key: "funded",
      group: "Funding",
      label: "Funded Account",
      to: "/app/funded",
      icon: BadgeCheck,
      tagline: "Manage funded capital balance, loss allowance, and withdrawable share",
      features: [
        `Real-time ${er.profit_split ?? 70}% trader share on funded profits`,
        "Supported Indian brokers: Zerodha, Dhan, Angel One & Upstox",
        "Live funded capital, balance & overall drawdown limit",
        "Direct link to request verified UPI/bank payouts",
      ],
    },
    {
      key: "kyc",
      group: "Funding",
      label: "KYC",
      to: "/app/kyc",
      icon: IdCard,
      tagline: "Verified PAN, Aadhaar & bank details stored securely for payouts",
      features: [
        "PAN card, 12-digit Aadhaar, bank account & IFSC validation",
        "Saved directly to your account profile via API",
        "Live submission & verification status pipeline",
        "Required before releasing your first funded payout",
      ],
    },
    {
      key: "certificates",
      group: "Funding",
      label: "Certificates",
      to: "/app/certificates",
      icon: Award,
      tagline: "Verified IndiFunded funded trader & payout milestone certificates",
      features: [
        "Issued high-resolution payout & challenge pass certificates",
        "Public QR verification codes matching Payout IDs",
        "Downloadable milestone badges for your trading portfolio",
        "Automatic sync when admin publishes verified certificates",
      ],
    },
    {
      key: "payouts",
      group: "Funding",
      label: "Payouts",
      to: "/app/payouts",
      icon: Wallet,
      tagline: `Withdraw ${er.profit_split ?? 70}% profit splits with verified settlement`,
      features: [
        "Eligible withdrawal balance & pending request overview",
        "Direct payout requests via UPI ID or IMPS/NEFT bank transfer",
        "Transparent status pipeline (Pending → Approved → Paid)",
        "UTR verification reference & cumulative paid-out totals",
      ],
    },
    {
      key: "notifications",
      group: "Account",
      label: "Notifications",
      to: "/app/notifications",
      icon: Bell,
      tagline: "Real alerts for fund credits, drawdown warnings, and KYC status",
      features: [
        "Instant alerts when admin credits funds or provisions an account",
        "Live drawdown proximity & account readiness checks",
        "Read/unread state persisted in your trader account",
        "One-click mark all read",
      ],
    },
    {
      key: "support",
      group: "Account",
      label: "Support",
      to: "/app/support",
      icon: LifeBuoy,
      tagline: "Raise persistent support tickets directly to the IndiFunded team",
      features: [
        "Create tracked support tickets saved to the backend",
        "Track Pending & Resolved ticket status in real time",
        "Categorized across Account, Trading, Payouts & KYC",
        "7-day Indian market hours desk responsiveness",
      ],
    },
    {
      key: "settings",
      group: "Account",
      label: "Profile Settings",
      to: "/app/settings",
      icon: SettingsIcon,
      tagline: "Manage trader profile details, phone & account credentials",
      features: [
        "Update full display name and registered phone number",
        "Inspect account security and password settings",
        "Direct access to challenge rules and billing records",
        "Clean profile sync across dashboard screens",
      ],
    },
  ];
}

const FAQS = [
  [
    "How do I start trading on the IndiFunded terminal?",
    "New accounts start with ₹0 simulated balance. Pick a challenge plan from Challenges & Plans, complete payment, and your challenge wallet activates immediately inside My Accounts and the Trading Terminal.",
  ],
  [
    "What happens if I try to place an order before purchasing a plan?",
    "You can browse live NSE & BSE quotes and candlesticks anytime, and clicking BUY or SELL prompts you to purchase a challenge plan first so every trade is backed by a real account.",
  ],
  [
    "How are evaluation targets and risk limits controlled?",
    "All profit target, daily loss, overall drawdown, minimum trading days, and daily trade caps are configured and enforced server-side — keeping every account fair and consistent.",
  ],
  [
    "How fast are funded payouts processed?",
    "Once you complete verification (PAN + Aadhaar + bank IFSC/UPI), payout requests on funded profits are verified and settled via UPI/IMPS within 24 hours.",
  ],
];

function ScreenPreview({ screen, quotes, er, plans }) {
  const k = screen.key;
  if (k === "terminal" || k === "positions") {
    const rows = quotes.length
      ? quotes
          .slice(0, 5)
          .map((q) => [
            `${q.symbol} · ${q.exchange}`,
            q.kind === "EQUITY" ? `₹${formatPrice(q.ltp)}` : formatPrice(q.ltp),
            `${q.changePct >= 0 ? "+" : ""}${q.changePct.toFixed(2)}%`,
          ])
      : [["Fetching live NSE/BSE quotes…", "—", "—"]];
    return (
      <div>
        <div className="vt-mock-list tabular-nums">
          {rows.map(([s, p, c]) => (
            <div key={s}>
              <span>{s}</span>
              <span className="font-mono">{p}</span>
              <span className={c.startsWith("-") ? "vt-down" : "vt-up"}>{c}</span>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <Link to="/app/terminal" className="vt-btn-buy">
            BUY
          </Link>
          <Link to="/app/terminal" className="vt-btn-sell">
            SELL
          </Link>
        </div>
      </div>
    );
  }
  if (k === "orders" || k === "tradebook" || k === "calendar") {
    const rows = quotes
      .slice(0, 4)
      .map((q) => [
        q.exchange || "NSE",
        q.symbol,
        q.kind === "EQUITY" ? `₹${formatPrice(q.ltp)}` : formatPrice(q.ltp),
      ]);
    return (
      <div className="vt-mock-list tabular-nums">
        {rows.length ? (
          rows.map(([ex, sym, ltp]) => (
            <div key={sym}>
              <span className="text-[var(--muted-2)]">{ex}</span>
              <span>{sym}</span>
              <span className="vt-up">{ltp}</span>
            </div>
          ))
        ) : (
          <div>
            <span>Waiting for market feed…</span>
          </div>
        )}
      </div>
    );
  }
  if (k === "evaluation" || k === "risk" || k === "insights") {
    return (
      <div className="vt-mock-kpis tabular-nums">
        <div>
          <span>Profit Target</span>
          <strong className="vt-up">{er.profit_target_pct ?? 8}%</strong>
        </div>
        <div>
          <span>Daily Loss Cap</span>
          <strong>{er.daily_loss_limit_pct ?? 5}%</strong>
        </div>
        <div>
          <span>Max Drawdown</span>
          <strong>{er.max_loss_limit ?? 20}%</strong>
        </div>
        <div>
          <span>Min Trading Days</span>
          <strong>{er.min_trading_days ?? 10} days</strong>
        </div>
      </div>
    );
  }
  if (k === "funded" || k === "kyc" || k === "payouts" || k === "certificates") {
    const maxCap = plans.length
      ? Math.max(...plans.map((p) => Number(p.account_size || 0)))
      : 500000;
    return (
      <div className="vt-mock-kpis tabular-nums">
        <div>
          <span>Profit Split</span>
          <strong className="vt-up">{er.profit_split ?? 70}% Trader</strong>
        </div>
        <div>
          <span>Max Plan Size</span>
          <strong>{formatINR(maxCap)}</strong>
        </div>
        <div>
          <span>Verification</span>
          <strong>PAN + Bank</strong>
        </div>
        <div>
          <span>Certificates</span>
          <strong>QR Verified</strong>
        </div>
      </div>
    );
  }
  const minFee = plans.length ? Math.min(...plans.map((p) => Number(p.challenge_fee || 0))) : 4999;
  return (
    <div className="vt-mock-kpis tabular-nums">
      <div>
        <span>Default Capital</span>
        <strong>₹0 (Pre-plan)</strong>
      </div>
      <div>
        <span>Plans Starting</span>
        <strong className="vt-up">{formatINR(minFee)}</strong>
      </div>
      <div>
        <span>Trades / Day Cap</span>
        <strong>{er.trades_per_day ?? 5} / day</strong>
      </div>
      <div>
        <span>Screens</span>
        <strong>16 Modules</strong>
      </div>
    </div>
  );
}

export default function VirtualTrading() {
  const { user } = useAuth();
  const { settings } = useSettings();

  const [groupFilter, setGroupFilter] = useState("ALL");
  const [activeKey, setActiveKey] = useState("terminal");
  const [plans, setPlans] = useState([]);

  const { quotes, marketStatus } = useLiveMarketQuotes(SHOWCASE_SYMBOLS, {
    pollMs: 12000,
  });

  useEffect(() => {
    api
      .get("/plans")
      .then((r) => setPlans(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  const er = settings.evaluation_risk || {};
  const DASHBOARD_SCREENS = buildScreens(er);

  const filteredScreens =
    groupFilter === "ALL"
      ? DASHBOARD_SCREENS
      : DASHBOARD_SCREENS.filter((s) => s.group === groupFilter);

  const activeScreen =
    filteredScreens.find((s) => s.key === activeKey) || filteredScreens[0] || DASHBOARD_SCREENS[0];

  const featuredPlan = plans.find((p) => p.popular) || plans[0] || null;
  const terminalHref = user ? "/app/terminal" : "/login?next=/app/terminal";
  const challengeHref = "/challenges";

  return (
    <div className="vt-page">
      <section className="vt-hero container-xl">
        <div className="home-eyebrow justify-center">
          Trader Platform · Pro NSE & BSE Execution Desk
        </div>
        <h1 className="font-display">
          All NSE & BSE markets.
          <br />
          <span className="text-[var(--accent-2,var(--accent))]">One real-data desk.</span>
        </h1>
        <p>
          Trade NIFTY 50, BANK NIFTY, FIN NIFTY, MIDCAP NIFTY, SENSEX, BANKEX, and every NSE/BSE
          stock with live candlesticks, EMA20, volume bars, and admin-governed risk controls.
        </p>

        {/* Pro Trader Execution Desk directly on the Platform Page */}
        <div
          className="mt-8 rounded-2xl border border-[var(--border-hi)] bg-[#0b101b] shadow-[0_24px_80px_-24px_rgba(0,0,0,0.85)] overflow-hidden text-left"
          data-testid="platform-live-screen"
        >
          <div className="px-4 sm:px-6 py-3 border-b border-[var(--border)] bg-[#0f1626] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 text-xs font-mono text-[var(--muted)]">
              <span className="font-semibold text-white tracking-wide">INDIFUNDED DESK</span>
              <span className="text-[var(--border-hi)]">|</span>
              <span>NSE · BSE · NIFTY · BANKNIFTY · SENSEX · FINNIFTY · EQUITIES</span>
            </div>
            <div className="text-[11px] font-mono text-[var(--muted-2)] tabular-nums">
              Split {er.profit_split ?? 70}% · Daily Cap {er.daily_loss_limit_pct ?? 5}% · Max DD{" "}
              {er.max_loss_limit ?? 20}%
            </div>
          </div>
          <div className="p-4 sm:p-6">
            <TradingTerminal embedded />
          </div>
        </div>

        <div className="flex flex-wrap justify-center gap-3 mt-6">
          <Link
            to={challengeHref}
            className="btn-amber rounded-full px-6 py-3 text-sm font-semibold inline-flex items-center gap-2"
          >
            Go for a Funded Account <ArrowRight size={14} />
          </Link>
          <a href="#explore" className="btn-ghost rounded-full px-6 py-3 text-sm">
            Tour All 16 Screens
          </a>
        </div>

        <div className="vt-hero-stats">
          <div>
            <strong className="font-display">NSE + BSE</strong>
            <span>Indices &amp; equities</span>
          </div>
          <div>
            <strong className="font-display">{er.profit_split ?? 70}%</strong>
            <span>Trader profit split</span>
          </div>
          <div>
            <strong className="font-display">16</strong>
            <span>Real-data screens</span>
          </div>
        </div>
      </section>

      <section id="explore" className="home-band">
        <div className="container-xl">
          <div className="home-section-heading">
            <div>
              <div className="home-eyebrow">Interactive Dashboard Tour</div>
              <h2 className="font-display">Every trader screen, explained</h2>
              <p>
                Filter by category and tap any screen to inspect its features and real market & rule
                parameters.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mb-5">
            {GROUPS.map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => {
                  setGroupFilter(g.id);
                  const first =
                    g.id === "ALL"
                      ? DASHBOARD_SCREENS[0]
                      : DASHBOARD_SCREENS.find((s) => s.group === g.id);
                  if (first) setActiveKey(first.key);
                }}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium border transition ${
                  groupFilter === g.id
                    ? "bg-[var(--accent)] border-[var(--accent)] text-white"
                    : "border-[var(--border-hi)] text-[var(--muted)] hover:text-white"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>

          <div className="vt-tour">
            <div className="vt-tour-tabs" role="tablist">
              {filteredScreens.map((s) => (
                <button
                  key={s.key}
                  role="tab"
                  aria-selected={activeScreen.key === s.key}
                  className={activeScreen.key === s.key ? "is-active" : ""}
                  onClick={() => setActiveKey(s.key)}
                >
                  <s.icon size={15} />
                  <span>{s.label}</span>
                </button>
              ))}
            </div>
            <div className="vt-tour-panel card-panel">
              <div className="vt-device">
                <div className="vt-device-bar">
                  <span>
                    {activeScreen.group} · {activeScreen.label}
                  </span>
                  <span className="chip text-[10px]">
                    {activeScreen.key === "terminal" || activeScreen.key === "positions"
                      ? `NSE/BSE · ${marketStatus}`
                      : "Live config"}
                  </span>
                </div>
                <ScreenPreview screen={activeScreen} quotes={quotes} er={er} plans={plans} />
              </div>
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-[var(--emerald)]">
                  {activeScreen.group} Module
                </div>
                <h3 className="font-display text-2xl text-white mt-1">{activeScreen.label}</h3>
                <p className="text-sm text-[var(--muted)] mt-1.5 mb-4">{activeScreen.tagline}</p>
                <ul className="vt-points">
                  {activeScreen.features.map((f) => (
                    <li key={f}>
                      <CheckCircle2 size={14} />
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="mt-5">
                  <Link
                    to={
                      user ? activeScreen.to : `/login?next=${encodeURIComponent(activeScreen.to)}`
                    }
                    className="btn-amber rounded-full px-5 py-2 text-xs font-semibold inline-flex items-center gap-2"
                  >
                    Open {activeScreen.label} <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-band">
        <div className="container-xl">
          <div className="home-section-heading">
            <div>
              <div className="home-eyebrow">Complete Feature Directory</div>
              <h2 className="font-display">All 16 Trader Dashboard Modules</h2>
              <p>
                Organized into 4 workspaces — Trading, Performance, Funding, and Account — synced
                with your purchased challenge & funded accounts.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DASHBOARD_SCREENS.map((s) => (
              <article
                key={s.key}
                className="card-panel p-5 flex flex-col justify-between gap-3 hover:border-[var(--emerald)]/50 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--emerald)] grid place-items-center">
                      <s.icon size={17} />
                    </span>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--muted-2)]">
                      {s.group}
                    </span>
                  </div>
                  <h3 className="font-display text-lg text-white mt-3">{s.label}</h3>
                  <p className="text-xs text-[var(--muted)] mt-1 leading-relaxed">{s.tagline}</p>
                  <ul className="mt-3 space-y-1.5 text-xs text-[var(--muted)]">
                    {s.features.slice(0, 3).map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <CheckCircle2 size={13} className="text-[var(--emerald)] shrink-0 mt-0.5" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <Link
                  to={user ? s.to : `/login?next=${encodeURIComponent(s.to)}`}
                  className="text-xs font-medium text-[var(--emerald)] inline-flex items-center gap-1 pt-2 border-t border-[var(--border)] hover:underline"
                >
                  Explore {s.label} <ArrowRight size={12} />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-band">
        <div className="container-xl">
          <div className="home-section-heading">
            <div>
              <div className="home-eyebrow">Funding Workflow</div>
              <h2 className="font-display">Purchase a plan, pass rules, get funded</h2>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            <div className="card-panel p-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--emerald)] grid place-items-center">
                <Briefcase size={18} />
              </div>
              <h3 className="font-display text-lg text-white mt-3">1. Purchase Challenge Plan</h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                Every account begins at ₹0. Pick a challenge size on{" "}
                <Link to="/challenges" className="text-[var(--emerald)] underline">
                  /challenges
                </Link>{" "}
                to credit simulated capital instantly into My Accounts.
              </p>
            </div>
            <div className="card-panel p-5">
              <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--emerald)] grid place-items-center">
                <CandlestickChart size={18} />
              </div>
              <h3 className="font-display text-lg text-white mt-3">
                2. Trade Real NSE & BSE Feeds
              </h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                Execute instant MARKET orders against NIFTY, BANKNIFTY, SENSEX, and top
                stocks with trade notes recorded straight to your Trade Book.
              </p>
            </div>
            <div className="card-panel p-5">
              <div className="w-9 h-9 rounded-lg bg-amber-500/15 text-amber-400 grid place-items-center">
                <Wallet size={18} />
              </div>
              <h3 className="font-display text-lg text-white mt-3">3. Get Funded & Withdraw</h3>
              <p className="text-xs text-[var(--muted)] mt-1.5 leading-relaxed">
                Hit your {er.profit_target_pct ?? 8}% target over {er.min_trading_days ?? 10}+
                trading days, complete KYC, and withdraw up to {er.profit_split ?? 70}% profit
                splits.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="home-band">
        <div className="container-xl">
          <div className="home-section-heading">
            <div>
              <div className="home-eyebrow">After the challenge</div>
              <h2 className="font-display">Choose your trading platform</h2>
              <p>
                Challenge trading is simulated. Once you pass and complete verification, you pick
                the broker for your real funded account, subject to applicable terms.
              </p>
            </div>
          </div>
          <div className="vt-brokers">
            {BROKERS.map(([n, d]) => (
              <article key={n} className="card-panel p-5">
                <div className="vt-broker-mark font-display">
                  {n
                    .split(" ")
                    .map((w) => w[0])
                    .join("")}
                </div>
                <h3 className="font-display text-xl mt-3">{n}</h3>
                <p className="text-sm vt-muted mt-1.5">{d}</p>
                <div className="chip text-[10px] mt-3">Available after you pass</div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="home-band">
        <div className="container-xl vt-two">
          <div>
            <div className="home-eyebrow">Risk management</div>
            <h2 className="font-display vt-h2">Built-in server-side protection</h2>
            <div className="vt-risk mt-6">
              {[
                [
                  Gauge,
                  `${er.max_loss_limit ?? featuredPlan?.max_loss_limit ?? 20}%`,
                  "Maximum drawdown",
                  "Overall loss cap measured against starting capital.",
                ],
                [
                  ListOrdered,
                  `${er.trades_per_day ?? featuredPlan?.trades_per_day ?? 5} trades`,
                  "Max trades per day",
                  "Enforced server-side across every trading day.",
                ],
                [
                  Target,
                  `${er.profit_target_pct ?? 8}% target`,
                  "Profit target tracking",
                  "Progress updated live from closed trades.",
                ],
                [
                  Activity,
                  "Real-time",
                  "NSE & BSE live feeds",
                  "Live market polling across indices and equities.",
                ],
              ].map(([Icon, v, t, d]) => (
                <div key={t} className="card-panel p-4">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-[var(--accent)]" />
                    <strong className="font-display text-lg">{v}</strong>
                  </div>
                  <div className="text-sm mt-2">{t}</div>
                  <p className="text-xs vt-muted mt-1">{d}</p>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div className="home-eyebrow">Verification & activation</div>
            <h2 className="font-display vt-h2">Account verification tracker</h2>
            <div className="card-panel p-5 mt-6">
              <ol className="vt-tracker">
                {TRACKER.map((t, i) => (
                  <li key={t}>
                    <Circle size={14} />
                    <span>
                      {i + 1}. {t}
                    </span>
                    <em>step {i + 1}</em>
                  </li>
                ))}
              </ol>
              <div className="mt-5 pt-4 border-t border-[var(--border)]">
                <div className="text-sm font-medium flex items-center gap-2">
                  <FileText size={14} /> Required documents
                </div>
                <ul className="text-sm vt-muted mt-2 space-y-1">
                  <li>PAN card · Aadhaar (12-digit) · Bank account & IFSC</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="home-band">
        <div className="container-xl max-w-3xl">
          <div className="home-eyebrow">FAQs</div>
          <h2 className="font-display vt-h2">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="mt-6">
            {FAQS.map(([q, a], i) => (
              <AccordionItem key={i} value={`q${i}`}>
                <AccordionTrigger>{q}</AccordionTrigger>
                <AccordionContent className="vt-muted">{a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              to={challengeHref}
              className="btn-amber rounded-full px-6 py-3 text-sm inline-flex items-center gap-2"
            >
              Go for a Funded Account <ArrowRight size={14} />
            </Link>
            <Link
              to="/rules"
              className="btn-ghost rounded-full px-6 py-3 text-sm inline-flex items-center gap-2"
            >
              <ShieldCheck size={14} /> Read the rules
            </Link>
            <Link
              to={terminalHref}
              className="btn-ghost rounded-full px-6 py-3 text-sm inline-flex items-center gap-2"
            >
              <Server size={14} /> Open Trading Terminal
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
