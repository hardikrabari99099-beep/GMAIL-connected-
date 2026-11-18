import { useEffect, useMemo, useRef, useState } from "react";
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  LineStyle,
  createChart,
} from "lightweight-charts";
import { formatPrice } from "../lib/useLiveMarket";

function normalizeCandles(candles) {
  if (!Array.isArray(candles) || !candles.length) return [];
  const seen = new Set();
  const normalized = [];
  for (let i = 0; i < candles.length; i++) {
    const c = candles[i];
    if (!c) continue;
    let t = Number(c.time);
    if (!Number.isFinite(t) || t <= 0) {
      t = Math.floor(Date.now() / 1000) - (candles.length - i) * 300;
    } else if (t > 1e12) {
      t = Math.floor(t / 1000);
    } else {
      t = Math.floor(t);
    }
    while (seen.has(t)) t += 1;
    seen.add(t);
    const open = Number(c.open);
    const high = Number(c.high);
    const low = Number(c.low);
    const close = Number(c.close);
    if (![open, high, low, close].every(Number.isFinite)) continue;
    normalized.push({
      time: t,
      open,
      high,
      low,
      close,
      volume: Number(c.volume || 0),
      label: c.label || "",
    });
  }
  normalized.sort((a, b) => a.time - b.time);
  return normalized;
}

function formatIstTime(unixSec) {
  try {
    const d = new Date(Number(unixSec) * 1000);
    return d.toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

/* ---------- TradingView Lightweight Charts interactive OHLC + EMA20 + Volume ---------- */
export function CandleChart({
  candles,
  height = 340,
  loading = false,
  refreshing = false,
  mode = "candle",
  showEma = true,
  symbol = "",
}) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);
  const candleSeriesRef = useRef(null);
  const areaSeriesRef = useRef(null);
  const emaSeriesRef = useRef(null);
  const volSeriesRef = useRef(null);
  const fittedKeyRef = useRef("");

  const bars = useMemo(() => normalizeCandles(candles), [candles]);

  const ema20 = useMemo(() => {
    if (!bars.length) return [];
    const k = 2 / (20 + 1);
    const out = [];
    let prev = bars[0].close;
    for (let i = 0; i < bars.length; i++) {
      prev = i === 0 ? bars[i].close : bars[i].close * k + prev * (1 - k);
      out.push({ time: bars[i].time, value: +prev.toFixed(2) });
    }
    return out;
  }, [bars]);

  const barByTime = useMemo(() => {
    const map = new Map();
    bars.forEach((b, idx) => map.set(b.time, { ...b, ema: ema20[idx]?.value }));
    return map;
  }, [bars, ema20]);

  const [hoveredBar, setHoveredBar] = useState(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof window === "undefined") return;

    // Guard for test environments (e.g. jsdom without canvas getContext)
    try {
      const testCanvas = document.createElement("canvas");
      if (!testCanvas.getContext || !testCanvas.getContext("2d")) return;
    } catch {
      return;
    }

    const chart = createChart(el, {
      width: el.clientWidth || 640,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#8a94a3",
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 11,
        attributionLogo: false,
      },
      grid: {
        vertLines: { color: "rgba(31, 38, 48, 0.55)" },
        horzLines: { color: "rgba(31, 38, 48, 0.55)" },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: "rgba(41, 211, 154, 0.45)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#141922",
        },
        horzLine: {
          color: "rgba(41, 211, 154, 0.45)",
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: "#141922",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(43, 51, 64, 0.8)",
        scaleMargins: { top: 0.12, bottom: 0.2 },
      },
      timeScale: {
        borderColor: "rgba(43, 51, 64, 0.8)",
        timeVisible: true,
        secondsVisible: false,
        rightOffset: 4,
      },
      localization: {
        timeFormatter: (time) => formatIstTime(time),
        priceFormatter: (price) => formatPrice(price, 2),
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    });

    const volSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: "volume" },
      priceScaleId: "",
      lastValueVisible: false,
      priceLineVisible: false,
    });
    volSeries.priceScale().applyOptions({
      scaleMargins: { top: 0.82, bottom: 0 },
    });

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#29d39a",
      downColor: "#ff5574",
      borderUpColor: "#29d39a",
      borderDownColor: "#ff5574",
      wickUpColor: "#29d39a",
      wickDownColor: "#ff5574",
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: "#29d39a",
      topColor: "rgba(41, 211, 154, 0.28)",
      bottomColor: "rgba(41, 211, 154, 0.01)",
      lineWidth: 2,
      visible: false,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const emaSeries = chart.addSeries(LineSeries, {
      color: "#f59e0b",
      lineWidth: 1.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    chartRef.current = chart;
    candleSeriesRef.current = candleSeries;
    areaSeriesRef.current = areaSeries;
    emaSeriesRef.current = emaSeries;
    volSeriesRef.current = volSeries;
    fittedKeyRef.current = "";

    const ro =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver((entries) => {
            for (const entry of entries) {
              const w = Math.floor(entry.contentRect.width);
              if (w > 0) chart.applyOptions({ width: w, height });
            }
          })
        : null;
    if (ro) ro.observe(el);

    return () => {
      if (ro) ro.disconnect();
      chart.remove();
      chartRef.current = null;
      candleSeriesRef.current = null;
      areaSeriesRef.current = null;
      emaSeriesRef.current = null;
      volSeriesRef.current = null;
    };
  }, [height]);

  useEffect(() => {
    const chart = chartRef.current;
    if (!chart) return;
    const handler = (param) => {
      if (!param || !param.time) {
        setHoveredBar(null);
        return;
      }
      const match = barByTime.get(Number(param.time));
      setHoveredBar(match || null);
    };
    chart.subscribeCrosshairMove(handler);
    return () => {
      try {
        chart.unsubscribeCrosshairMove(handler);
      } catch {
        /* chart disposed */
      }
    };
  }, [barByTime, height]);

  useEffect(() => {
    const chart = chartRef.current;
    const candleSeries = candleSeriesRef.current;
    const areaSeries = areaSeriesRef.current;
    const emaSeries = emaSeriesRef.current;
    const volSeries = volSeriesRef.current;
    if (!chart || !candleSeries || !areaSeries || !emaSeries || !volSeries || !bars.length) {
      return;
    }

    const isArea = mode === "area";
    candleSeries.applyOptions({
      visible: !isArea,
      lastValueVisible: !isArea,
      priceLineVisible: !isArea,
    });
    areaSeries.applyOptions({
      visible: isArea,
      lastValueVisible: isArea,
      priceLineVisible: isArea,
    });

    if (isArea) {
      areaSeries.setData(bars.map((b) => ({ time: b.time, value: b.close })));
    } else {
      candleSeries.setData(
        bars.map((b) => ({
          time: b.time,
          open: b.open,
          high: b.high,
          low: b.low,
          close: b.close,
        })),
      );
    }

    volSeries.setData(
      bars.map((b) => ({
        time: b.time,
        value: b.volume || 0,
        color: b.close >= b.open ? "rgba(41, 211, 154, 0.24)" : "rgba(255, 85, 116, 0.24)",
      })),
    );

    emaSeries.applyOptions({ visible: Boolean(showEma) });
    emaSeries.setData(showEma ? ema20 : []);

    const fitKey = `${symbol}:${bars.length > 0 ? bars[0].time : 0}:${bars.length}`;
    if (fittedKeyRef.current !== fitKey) {
      fittedKeyRef.current = fitKey;
      chart.timeScale().fitContent();
    }
  }, [bars, ema20, mode, showEma, symbol]);

  if (loading && !bars.length) {
    return (
      <div className="candle-skeleton" style={{ height }}>
        <div className="text-xs font-mono text-[var(--muted-2)]">
          Loading TradingView NSE/BSE feed…
        </div>
      </div>
    );
  }
  if (!bars.length) {
    return (
      <div className="candle-skeleton" style={{ height }}>
        <div className="text-xs font-mono text-[var(--muted-2)]">
          No candle bars available for this interval.
        </div>
      </div>
    );
  }

  const last = bars[bars.length - 1];
  const activeBar = hoveredBar || last;
  const barChg = activeBar.open ? ((activeBar.close - activeBar.open) / activeBar.open) * 100 : 0;
  const activeEma = hoveredBar?.ema ?? ema20[ema20.length - 1]?.value;

  return (
    <div className={`relative select-none ${refreshing ? "opacity-95 transition-opacity" : ""}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-[var(--muted-2)] mb-2 tabular-nums">
        <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1">
          <span className="text-white/80">
            {activeBar.label || formatIstTime(activeBar.time) || "Latest"}
          </span>
          <span>
            O <strong className="text-white">{formatPrice(activeBar.open)}</strong>
          </span>
          <span>
            H <strong className="text-[var(--emerald)]">{formatPrice(activeBar.high)}</strong>
          </span>
          <span>
            L <strong className="text-[var(--rose)]">{formatPrice(activeBar.low)}</strong>
          </span>
          <span>
            C{" "}
            <strong
              className={
                activeBar.close >= activeBar.open ? "text-[var(--emerald)]" : "text-[var(--rose)]"
              }
            >
              {formatPrice(activeBar.close)}
            </strong>
          </span>
          <span className={barChg >= 0 ? "text-[var(--emerald)]" : "text-[var(--rose)]"}>
            {barChg >= 0 ? "+" : ""}
            {barChg.toFixed(2)}%
          </span>
          {activeBar.volume > 0 && (
            <span>
              Vol{" "}
              <strong className="text-white">
                {Number(activeBar.volume).toLocaleString("en-IN")}
              </strong>
            </span>
          )}
          {showEma && activeEma != null && (
            <span className="text-amber-400">
              EMA20 <strong>{formatPrice(activeEma)}</strong>
            </span>
          )}
        </div>
        <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-md border border-[var(--border-hi)] bg-white/[0.03] text-[var(--muted)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--emerald)]" />
          TradingView{symbol ? ` · ${symbol}` : ""}
        </span>
      </div>

      <div
        ref={containerRef}
        className="w-full rounded-xl overflow-hidden"
        style={{ height }}
        role="img"
        aria-label="TradingView interactive candlestick chart"
        data-testid="tradingview-chart"
      />
    </div>
  );
}
