import { useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import { useSEO } from "../lib/useSEO";
import { useSettings } from "../context/SettingsContext";
import { useLiveMarketQuotes, formatPrice } from "../lib/useLiveMarket";
import { useTraderState } from "../lib/useTraderState";
import { Calculator, Percent, TrendingDown, LineChart, Radio, RefreshCw } from "lucide-react";

const CALC_SYMBOLS = ["NIFTY", "BANKNIFTY", "SENSEX", "RELIANCE", "HDFCBANK", "TCS", "INFY"];

const formatINR = (n) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Math.round(Number(n) || 0));
const num = (n, d = 2) => (Number.isFinite(n) ? n.toFixed(d) : "—");

function Card({ title, icon, children, tag }) {
  return (
    <div className="glass-card p-6 md:p-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl grid place-items-center border border-[var(--border-hi)] text-[var(--accent)]">
          {icon}
        </div>
        <div>
          <div className="font-display text-lg">{title}</div>
          {tag && (
            <div className="text-[10px] uppercase tracking-widest font-mono text-[var(--muted-2)]">
              {tag}
            </div>
          )}
        </div>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Row({ label, value, right }) {
  return (
    <div className="flex justify-between items-baseline text-sm border-b border-[var(--border)]/60 py-2">
      <span className="text-[var(--muted)]">{label}</span>
      <span className="font-mono text-white">{right ?? value}</span>
    </div>
  );
}

function Input({ label, value, onChange, suffix, min, step = 1 }) {
  return (
    <label className="block">
      <div className="text-xs text-[var(--muted-2)] font-mono uppercase tracking-wider mb-1.5">
        {label}
      </div>
      <div className="flex items-center bg-[var(--bg-1)] border border-[var(--border-hi)] rounded-lg px-3">
        <input
          type="number"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(e.target.value === "" ? "" : Number(e.target.value))}
          className="flex-1 bg-transparent py-2.5 text-white font-mono focus:outline-none min-w-0"
        />
        {suffix && <span className="text-xs text-[var(--muted-2)] font-mono">{suffix}</span>}
      </div>
    </label>
  );
}

function PositionSize({ account, setAccount, entry, setEntry, stop, setStop }) {
  const [riskPct, setRiskPct] = useState(1);
  const { risk, qty } = useMemo(() => {
    const acc = Number(account) || 0;
    const r = (acc * (Number(riskPct) || 0)) / 100;
    const perShare = Math.abs((Number(entry) || 0) - (Number(stop) || 0));
    const q = perShare > 0 ? r / perShare : 0;
    return { risk: r, qty: q };
  }, [account, riskPct, entry, stop]);
  return (
    <Card title="Position Size Calculator" icon={<Calculator size={18} />} tag="Live quote synced">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Account Size" value={account} onChange={setAccount} suffix="₹" />
        <Input label="Risk %" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1} />
        <Input label="Entry Price (LTP)" value={entry} onChange={setEntry} suffix="₹" step={0.05} />
        <Input label="Stop Loss Price" value={stop} onChange={setStop} suffix="₹" step={0.05} />
      </div>
      <div className="mt-5 space-y-0">
        <Row label="Amount at Risk" right={formatINR(risk)} />
        <Row label="Position Size (Qty)" right={num(qty, 0)} />
      </div>
    </Card>
  );
}

function RiskReward({ entry, setEntry, stop, setStop, target, setTarget }) {
  const { rr, rewardPct, riskPct } = useMemo(() => {
    const e = Number(entry) || 0;
    const r = Math.abs(e - (Number(stop) || 0));
    const w = Math.abs((Number(target) || 0) - e);
    return {
      rr: r > 0 ? w / r : 0,
      rewardPct: e > 0 ? (w / e) * 100 : 0,
      riskPct: e > 0 ? (r / e) * 100 : 0,
    };
  }, [entry, stop, target]);
  return (
    <Card title="Risk / Reward Calculator" icon={<Percent size={18} />} tag="Grade each setup">
      <div className="grid grid-cols-3 gap-3">
        <Input label="Entry (LTP)" value={entry} onChange={setEntry} suffix="₹" step={0.05} />
        <Input label="Stop" value={stop} onChange={setStop} suffix="₹" step={0.05} />
        <Input label="Target" value={target} onChange={setTarget} suffix="₹" step={0.05} />
      </div>
      <div className="mt-5">
        <Row label="Risk : Reward" right={`1 : ${num(rr)}`} />
        <Row label="Reward %" right={`${num(rewardPct)}%`} />
        <Row label="Risk %" right={`${num(riskPct)}%`} />
      </div>
    </Card>
  );
}

function Drawdown({
  start,
  setStart,
  maxLossPct,
  setMaxLossPct,
  dailyLossPct,
  setDailyLossPct,
}) {
  const { maxLossAmt, dailyLossAmt, floor } = useMemo(() => {
    const s = Number(start) || 0;
    const m = (s * (Number(maxLossPct) || 0)) / 100;
    const d = (s * (Number(dailyLossPct) || 0)) / 100;
    return { maxLossAmt: m, dailyLossAmt: d, floor: Math.max(0, s - m) };
  }, [start, maxLossPct, dailyLossPct]);
  return (
    <Card title="Drawdown Calculator" icon={<TrendingDown size={18} />} tag="Admin risk rules">
      <div className="grid grid-cols-3 gap-3">
        <Input label="Account Balance" value={start} onChange={setStart} suffix="₹" />
        <Input
          label="Max Loss %"
          value={maxLossPct}
          onChange={setMaxLossPct}
          suffix="%"
          step={0.5}
        />
        <Input
          label="Daily Loss %"
          value={dailyLossPct}
          onChange={setDailyLossPct}
          suffix="%"
          step={0.5}
        />
      </div>
      <div className="mt-5">
        <Row label="Max Loss Amount" right={formatINR(maxLossAmt)} />
        <Row label="Daily Loss Limit" right={formatINR(dailyLossAmt)} />
        <Row label="Account Floor" right={formatINR(floor)} />
      </div>
    </Card>
  );
}

function LotSize({ account, setAccount, lotSize, setLotSize, symbolLabel }) {
  const [riskPct, setRiskPct] = useState(1);
  const [slPoints, setSlPoints] = useState(30);
  const { risk, lots, contracts } = useMemo(() => {
    const r = ((Number(account) || 0) * (Number(riskPct) || 0)) / 100;
    const perLot = (Number(slPoints) || 0) * (Number(lotSize) || 0);
    const l = perLot > 0 ? r / perLot : 0;
    return { risk: r, lots: l, contracts: Math.floor(l) * (Number(lotSize) || 0) };
  }, [account, riskPct, slPoints, lotSize]);
  return (
    <Card
      title="Lot Size Calculator (F&O)"
      icon={<LineChart size={18} />}
      tag={symbolLabel || "NSE / BSE Lot"}
    >
      <div className="grid grid-cols-2 gap-3">
        <Input label="Account Size" value={account} onChange={setAccount} suffix="₹" />
        <Input label="Risk %" value={riskPct} onChange={setRiskPct} suffix="%" step={0.1} />
        <Input label="Stop Loss (points)" value={slPoints} onChange={setSlPoints} suffix="pts" />
        <Input label="Lot Size" value={lotSize} onChange={setLotSize} suffix="units" />
      </div>
      <div className="mt-5">
        <Row label="Amount at Risk" right={formatINR(risk)} />
        <Row label="Lots You Can Trade" right={num(lots, 2)} />
        <Row label="Total Contracts" right={num(contracts, 0)} />
      </div>
    </Card>
  );
}

export default function Tools() {
  useSEO({
    title: "Trading Tools & Calculators — Live NSE/BSE Synced Position Size, Risk, Drawdown",
    description:
      "Live NSE & BSE trading calculators from IndiFunded — synced with real index & equity quotes, your active account balance, and official risk limits.",
    path: "/tools",
  });

  const { settings } = useSettings();
  const { activeAccount } = useTraderState({ pollMs: 15000 });
  const { quotes, quoteMap, marketStatus, loading, refresh } = useLiveMarketQuotes(CALC_SYMBOLS, {
    pollMs: 6000,
  });

  const [plans, setPlans] = useState([]);
  const [selectedSym, setSelectedSym] = useState("NIFTY");
  const [selectedSource, setSelectedSource] = useState("auto");

  const evalRisk = settings.evaluation_risk || {};
  const [accountSize, setAccountSize] = useState(100000);
  const [entry, setEntry] = useState(24000);
  const [stop, setStop] = useState(23850);
  const [target, setTarget] = useState(24300);
  const [maxLossPct, setMaxLossPct] = useState(Number(evalRisk.max_loss_limit ?? 20));
  const [dailyLossPct, setDailyLossPct] = useState(Number(evalRisk.daily_loss_limit_pct ?? 5));
  const [lotSize, setLotSize] = useState(75);
  const [seededFromLive, setSeededFromLive] = useState(false);

  useEffect(() => {
    api
      .get("/plans")
      .then((r) => setPlans(Array.isArray(r.data) ? r.data : []))
      .catch(() => {});
  }, []);

  // Sync admin risk rules & user account capital/first plan
  useEffect(() => {
    if (selectedSource === "auto") {
      if (activeAccount?.balance) {
        setAccountSize(Number(activeAccount.balance));
        setMaxLossPct(Number(activeAccount.max_loss_limit ?? evalRisk.max_loss_limit ?? 20));
        setDailyLossPct(
          Number(activeAccount.daily_loss_limit_pct ?? evalRisk.daily_loss_limit_pct ?? 5),
        );
      } else if (plans.length) {
        const p = plans.find((x) => x.popular) || plans[0];
        setAccountSize(Number(p.account_size || 100000));
        setMaxLossPct(Number(evalRisk.max_loss_limit ?? p.max_loss_limit ?? 20));
        setDailyLossPct(Number(evalRisk.daily_loss_limit_pct ?? 5));
      } else {
        setMaxLossPct(Number(evalRisk.max_loss_limit ?? 20));
        setDailyLossPct(Number(evalRisk.daily_loss_limit_pct ?? 5));
      }
    }
  }, [activeAccount, plans, evalRisk, selectedSource]);

  const applyQuote = (sym) => {
    setSelectedSym(sym);
    const q = quoteMap[sym];
    if (!q?.ltp) return;
    const p = +Number(q.ltp).toFixed(2);
    const stepRisk = +(p * 0.006).toFixed(2);
    setEntry(p);
    setStop(+(p - stepRisk).toFixed(2));
    setTarget(+(p + stepRisk * 2).toFixed(2));
    setLotSize(q.lot || 1);
  };

  useEffect(() => {
    if (!seededFromLive && quoteMap[selectedSym]?.ltp) {
      applyQuote(selectedSym);
      setSeededFromLive(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteMap, selectedSym, seededFromLive]);

  const handleSourceChange = (val) => {
    setSelectedSource(val);
    if (val === "my-account" && activeAccount) {
      setAccountSize(Number(activeAccount.balance || activeAccount.starting_capital || 0));
      setMaxLossPct(Number(activeAccount.max_loss_limit ?? evalRisk.max_loss_limit ?? 20));
      setDailyLossPct(
        Number(activeAccount.daily_loss_limit_pct ?? evalRisk.daily_loss_limit_pct ?? 5),
      );
      return;
    }
    const plan = plans.find((p) => p.id === val);
    if (plan) {
      setAccountSize(Number(plan.account_size || 100000));
      setMaxLossPct(Number(evalRisk.max_loss_limit ?? plan.max_loss_limit ?? 20));
      setDailyLossPct(Number(evalRisk.daily_loss_limit_pct ?? 5));
    }
  };

  const activeQuote = quoteMap[selectedSym];

  return (
    <div className="container-xl pt-16 pb-24">
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="chip">Trader Tools</div>
        <span className={`live-badge ${marketStatus === "LIVE" ? "is-live" : "is-closed"}`}>
          <Radio size={11} /> {marketStatus === "LIVE" ? "NSE/BSE Live" : "NSE/BSE Last Close"}
        </span>
      </div>
      <h1 className="font-display text-4xl md:text-5xl max-w-3xl" data-testid="tools-title">
        Live-synced trading calculators
      </h1>
      <p className="text-[var(--muted)] mt-5 max-w-2xl">
        Synced with real-time NSE & BSE quotes, IndiFunded challenge plans, and live risk limits
        — click any instrument below to load its real price and lot size.
      </p>

      {/* Live Instrument & Account Sync Bar */}
      <div className="glass-card p-4 md:p-5 mt-8 space-y-4" data-testid="tools-live-bar">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs font-mono uppercase tracking-wider text-[var(--muted-2)]">
            1. Pick live NSE/BSE instrument to load LTP & Lot size
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select
              aria-label="Sync capital from plan or account"
              value={selectedSource}
              onChange={(e) => handleSourceChange(e.target.value)}
              className="input-dark !w-auto !py-1.5 !px-3 text-xs font-mono"
              data-testid="tools-source-select"
            >
              <option value="auto">
                {activeAccount
                  ? `Active Account (${activeAccount.account_number || activeAccount.plan_name})`
                  : "Synced Plan & Admin Risk"}
              </option>
              {activeAccount && (
                <option value="my-account">
                  My Account · {formatINR(activeAccount.balance)}
                </option>
              )}
              {plans.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} Plan · {formatINR(p.account_size)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={refresh}
              className="btn-ghost rounded-full px-3 py-1.5 text-xs inline-flex items-center gap-1.5"
            >
              <RefreshCw size={12} /> Sync LTP
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {CALC_SYMBOLS.map((sym) => {
            const q = quoteMap[sym];
            const isOn = selectedSym === sym;
            const up = (q?.changePct ?? 0) >= 0;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => applyQuote(sym)}
                data-testid={`calc-sym-${sym}`}
                className={`px-3 py-2 rounded-xl border text-left transition tabular-nums ${
                  isOn
                    ? "border-[var(--accent)] bg-[var(--accent)]/15 text-white"
                    : "border-[var(--border)] bg-[var(--bg-1)] text-[var(--muted)] hover:text-white"
                }`}
              >
                <div className="font-mono text-xs font-semibold flex items-center gap-2">
                  <span>{sym}</span>
                  {q?.lot > 1 && (
                    <span className="text-[10px] text-[var(--muted-2)]">Lot {q.lot}</span>
                  )}
                </div>
                <div className="text-xs font-mono mt-0.5 flex items-center gap-2">
                  <span className="text-white">
                    {q?.ltp
                      ? q.kind === "EQUITY"
                        ? `₹${formatPrice(q.ltp)}`
                        : formatPrice(q.ltp)
                      : loading
                        ? "…"
                        : "—"}
                  </span>
                  {q && (
                    <span className={up ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>
                      {up ? "+" : ""}
                      {q.changePct.toFixed(2)}%
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {activeQuote && (
          <div className="text-xs font-mono text-[var(--muted-2)] flex flex-wrap gap-x-5 gap-y-1 pt-2 border-t border-[var(--border)]/60 tabular-nums">
            <span>
              Selected: <strong className="text-white">{activeQuote.name}</strong> (
              {activeQuote.exchange})
            </span>
            <span>
              Live LTP: <strong className="text-white">{formatPrice(activeQuote.ltp)}</strong>
            </span>
            <span>
              Day High:{" "}
              <strong className="text-[var(--emerald)]">{formatPrice(activeQuote.high)}</strong>
            </span>
            <span>
              Day Low:{" "}
              <strong className="text-[var(--rose)]">{formatPrice(activeQuote.low)}</strong>
            </span>
            <span>
              Synced Capital: <strong className="text-white">{formatINR(accountSize)}</strong>
            </span>
          </div>
        )}
      </div>

      <div className="mt-8 grid md:grid-cols-2 gap-5">
        <PositionSize
          account={accountSize}
          setAccount={setAccountSize}
          entry={entry}
          setEntry={setEntry}
          stop={stop}
          setStop={setStop}
        />
        <RiskReward
          entry={entry}
          setEntry={setEntry}
          stop={stop}
          setStop={setStop}
          target={target}
          setTarget={setTarget}
        />
        <Drawdown
          start={accountSize}
          setStart={setAccountSize}
          maxLossPct={maxLossPct}
          setMaxLossPct={setMaxLossPct}
          dailyLossPct={dailyLossPct}
          setDailyLossPct={setDailyLossPct}
        />
        <LotSize
          account={accountSize}
          setAccount={setAccountSize}
          lotSize={lotSize}
          setLotSize={setLotSize}
          symbolLabel={`${selectedSym} · ${quotes.length ? "Live Lot Size" : "NSE Lot"}`}
        />
      </div>
    </div>
  );
}
