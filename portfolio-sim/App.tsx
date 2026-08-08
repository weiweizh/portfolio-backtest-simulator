import { type CSSProperties, useMemo, useState } from "react"
import { AreaChart } from "./components/dither-kit/area-chart"
import { Area } from "./components/dither-kit/area"
import { BarChart } from "./components/dither-kit/bar-chart"
import { Bar } from "./components/dither-kit/bar"
import { PieChart } from "./components/dither-kit/pie-chart"
import { Pie } from "./components/dither-kit/pie"
import { XAxis } from "./components/dither-kit/x-axis"
import { YAxis } from "./components/dither-kit/y-axis"
import { Grid } from "./components/dither-kit/grid"
import { Legend } from "./components/dither-kit/legend"
import { Tooltip } from "./components/dither-kit/tooltip"
import { DitherButton } from "./components/dither-kit/button"
import { Sparkline } from "./components/dither-kit/sparkline"
import type { DitherColor } from "./components/dither-kit/palette"
import type { AreaVariant } from "./components/dither-kit/chart-context"

/* ---------------- historical data (calendar-year total returns, %) ---------------- */
const YEARS = [2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015,
  2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025]

type SeriesKey = "voo" | "smh" | "qqq" | "gld" | "tlt" | "btc" | "cash" | "schd" | "schy" | "custom"

const SERIES: Record<Exclude<SeriesKey, "custom">, number[]> = {
  // S&P 500 total return (2006-2009: index; 2010-2025: VOO inception Sept 2010)
  voo: [15.79, 5.49, -37.00, 26.46, 15.06, 2.11, 16.00, 32.39, 13.69, 1.38,
    11.96, 21.83, -4.38, 31.49, 18.40, 28.71, -18.11, 26.29, 25.02, 17.82],
  // VanEck Semiconductor ETF
  smh: [-8.16, -3.54, -45.75, 58.55, 16.51, -6.46, 8.56, 33.31, 30.20, -0.37,
    35.53, 38.44, -9.04, 64.44, 55.54, 42.14, -33.52, 73.37, 39.08, 49.17],
  // Invesco QQQ (Nasdaq-100), approx.
  qqq: [7.08, 19.02, -41.73, 54.68, 20.14, 3.38, 18.12, 36.63, 19.18, 9.45,
    7.10, 32.66, -0.12, 38.96, 48.62, 27.42, -32.58, 54.85, 25.58, 20.77],
  // SPDR Gold Shares, approx.
  gld: [22.55, 30.45, 4.92, 24.03, 29.27, 9.57, 6.60, -28.33, -2.19, -10.67,
    8.03, 12.81, -1.94, 17.86, 24.81, -4.15, -0.77, 12.69, 26.66, 63.68],
  // iShares 20+Y Treasury, approx.
  tlt: [0.85, 10.15, 33.77, -21.53, 9.05, 33.96, 2.63, -13.37, 27.30, -1.79,
    1.18, 9.18, -1.61, 14.12, 18.15, -4.60, -31.24, 2.76, -7.83, 4.25],
  // Bitcoin (USD), approx.; no reliable market data before 2011 → 0%
  btc: [0, 0, 0, 0, 0, 1473, 186, 5507, -58.4, 35.4,
    124.6, 1338, -72.6, 94.8, 301.4, 59.8, -64.2, 155.5, 121.1, -6.36],
  // Cash / 3-month T-bills, approx.
  cash: [4.85, 4.44, 1.80, 0.16, 0.14, 0.06, 0.08, 0.05, 0.03, 0.05,
    0.32, 0.93, 1.94, 2.06, 0.37, 0.04, 2.02, 5.01, 5.25, 4.20],
  // Schwab U.S. Dividend Equity ETF (inception Oct 2011)
  schd: [0, 0, 0, 0, 0, 0, 14.63, 32.66, 13.52, -3.65,
    16.40, 20.52, -6.51, 28.41, 18.22, 28.07, -7.53, 22.15, 24.73, 16.82],
  // Schwab U.S. International Equity ETF (inception Oct 2016)
  schy: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0.74,
    -2.20, 27.30, -13.80, 26.67, -8.27, 7.57, -14.64, 18.22, 16.58, 8.45],
}

// BTC is entered as coins held; series data starts at ~$0.30 (start of 2011)
const BTC_START_PRICE = 0.30
const BTC_END_PRICE = SERIES.btc.reduce((p, r) => p * (1 + r / 100), BTC_START_PRICE)

const COLOR_CYCLE: DitherColor[] = ["grey", "blue", "orange", "purple", "green", "red"]
const VARIANT_CYCLE: AreaVariant[] = ["solid", "hatched", "dotted", "gradient"]

/* ---------------- i18n ---------------- */
type Lang = "zh" | "en"

const PRESET_NAMES: Record<Lang, Record<SeriesKey, string>> = {
  zh: {
    voo: "VOO 标普500", smh: "SMH 半导体", qqq: "QQQ 纳指100", gld: "GLD 黄金",
    tlt: "TLT 长期美债", btc: "BTC 比特币", cash: "现金/美债ETF", schd: "SCHD 美国高股息", schy: "SCHY 国际股票", custom: "自定义固定收益",
  },
  en: {
    voo: "VOO S&P 500", smh: "SMH Semiconductors", qqq: "QQQ Nasdaq-100", gld: "GLD Gold",
    tlt: "TLT 20+Y Treasury", btc: "BTC Bitcoin", cash: "Cash/Treasury ETF", schd: "SCHD Dividend ETF", schy: "SCHY International Equity", custom: "Custom fixed return",
  },
}

const STR = {
  zh: {
    winTitle: "SIMULATOR.EXE — 现金桶策略回测",
    title: "组合回测模拟器 2006–2025",
    subtitle:
      "自定义资产组合（可添加/删除/编辑），基于真实历史年度收益回测 20 年。策略：每年提取固定开销 —— 股票桶收益超过提取阈值时从股票桶取，否则从现金桶取；收益超过增持阈值时，另向现金桶增持一年开销。",
    config: "配置输入",
    modeGroup: "输入模式",
    modeAmount: "$ 金额",
    modePercent: "% 比例",
    groupAssets: "资产配置",
    groupStrategy: "提取与增持策略",
    thName: "名称",
    thSeries: "历史数据",
    thBucket: "所属桶",
    thAlloc: "配置",
    bucketStock: "股票桶",
    bucketCash: "现金桶",
    customRate: "固定年收益率 (%)",
    addAsset: "＋ 添加资产",
    removeAsset: "✕ 删除",
    removeAria: (n: string) => `删除资产 ${n}`,
    totalAmt: "总金额 ($)",
    withdraw: "每年开销金额 ($)",
    threshold: "增持触发收益率 (%)",
    thresholdHint: (v: string) => `股票年收益 > ${v}% 时，向现金桶增持一年提取额`,
    btcQty: "持有数量 (枚)",
    btcHint: (s: string, e: string) => `2011年初买入 ≈ ${s} → 2025年末 ≈ ${e}`,
    cashUse: "股票提取阈值 (%)",
    cashUseHint: (v: string) => `股票桶收益 > ${v}% 时从股票桶取开销，否则从现金桶取`,
    cashYearW: "低收益年现金提取 ($)",
    cashYearWHint: (v: string) => `股票收益 ≤ 阈值时，从现金桶提取 ${v}`,
    pctSum: "比例合计",
    need100: "（需为 100%）",
    errPct: (s: string) => `比例合计需为 100%（当前 ${s}%）`,
    errZero: "请输入大于 0 的资产金额",
    errNoAsset: "至少需要一个资产",
    run: "► 运行回测 RUN",
    reset: "✕ 重置 RESET",
    mFinal: "最终总资产",
    mGrowth: (x: string) => `增长${x}倍`,
    mReturn: "累计回报率",
    mCagr: (p: string) => `年化 ${p}`,
    mWithdrawn: "累计提取",
    mPerYear: (v: string) => `每年 ${v}`,
    mMinCash: "现金桶最低",
    mNoCash: "无现金桶资产",
    mNeverOut: "现金永不用尽 ✓",
    mDepleted: (y: number) => `⚠ ${y}年现金耗尽`,
    metricsAria: "回测结果指标",
    chart1: "资产构成 (堆叠, $M)",
    chart1Aria: "资产构成堆叠图",
    chart2: "组合年度净变化 (%)",
    chart2Aria: "年度收益柱状图",
    sRetPos: "上涨年 (%)",
    sRetNeg: "下跌年 (%)",
    allocTitle: "期初 vs 期末资产占比",
    allocAria: "期初与期末各资产桶占比对比",
    allocStart: "期初占比",
    allocEnd: "期末占比 (2025)",
    thAsset: "资产桶",
    thStartPct: "期初",
    thEndPct: "期末",
    thChangePct: "变化",
    tblTitle: "20年逐年明细",
    tblCaption: "每年各资产收益率、提取来源与期末余额",
    thYear: "年份",
    thSource: "提取来源",
    thWithdrawn: "提取金额",
    thRefill: "增持",
    thCashBal: "现金桶余额",
    thTotal: "总资产",
    thTotalChg: "总资产变化",
    srcStock: "股票",
    srcCash: "现金",
    srcBoth: "现金+股票",
    footer:
      "数据：各ETF日历年总回报（含分红，部分年份为近似值）；现金按 3 个月美债近似；比特币 2011 年起有数据，此前按 0% 计。仅供参考，不构成投资建议。",
  },
  en: {
    winTitle: "SIMULATOR.EXE — CASH BUCKET BACKTEST",
    title: "Portfolio Backtest Simulator 2006–2025",
    subtitle:
      "Build your own asset mix (add / remove / edit), then backtest 20 years of actual historical annual returns. Strategy: a fixed amount is withdrawn each year for spending — from the stock bucket when its return beats the withdrawal threshold, otherwise from the cash bucket; when the return beats the increase trigger, one extra year of spending is moved into cash.",
    config: "CONFIGURATION",
    modeGroup: "Input mode",
    modeAmount: "$ AMOUNT",
    modePercent: "% PERCENT",
    groupAssets: "ASSET ALLOCATION",
    groupStrategy: "WITHDRAWAL & REFILL STRATEGY",
    thName: "Name",
    thSeries: "Data series",
    thBucket: "Bucket",
    thAlloc: "Allocation",
    bucketStock: "Stock",
    bucketCash: "Cash",
    customRate: "Fixed annual return (%)",
    addAsset: "+ ADD ASSET",
    removeAsset: "✕ REMOVE",
    removeAria: (n: string) => `Remove asset ${n}`,
    totalAmt: "Total ($)",
    withdraw: "Annual spending ($)",
    threshold: "Increase trigger (%)",
    thresholdHint: (v: string) => `stock return > ${v}% adds 1 year of withdrawal to the cash bucket`,
    btcQty: "Coins held (BTC)",
    btcHint: (s: string, e: string) => `≈ ${s} at 2011 start → ≈ ${e} end of 2025`,
    cashUse: "Stock-withdrawal threshold (%)",
    cashUseHint: (v: string) => `stock return > ${v}% funds spending from stocks; otherwise from cash`,
    cashYearW: "Cash-year withdrawal ($)",
    cashYearWHint: (v: string) => `${v} withdrawn from cash when stock return ≤ threshold`,
    pctSum: "Percent total",
    need100: " (must equal 100%)",
    errPct: (s: string) => `Percentages must sum to 100% (currently ${s}%)`,
    errZero: "Please enter asset amounts greater than 0",
    errNoAsset: "Add at least one asset",
    run: "► RUN BACKTEST",
    reset: "✕ RESET",
    mFinal: "Final total assets",
    mGrowth: (x: string) => `${x}× growth`,
    mReturn: "Cumulative return",
    mCagr: (p: string) => `CAGR ${p}`,
    mWithdrawn: "Total withdrawn",
    mPerYear: (v: string) => `${v} per year`,
    mMinCash: "Cash bucket low",
    mNoCash: "No cash-bucket assets",
    mNeverOut: "Cash never runs out ✓",
    mDepleted: (y: number) => `⚠ Cash depleted in ${y}`,
    metricsAria: "Backtest result metrics",
    chart1: "ASSET COMPOSITION (STACKED, $M)",
    chart1Aria: "Stacked asset composition chart",
    chart2: "ANNUAL NET CHANGE (%)",
    chart2Aria: "Annual return bar chart",
    sRetPos: "Up years (%)",
    sRetNeg: "Down years (%)",
    allocTitle: "STARTING VS ENDING ALLOCATION",
    allocAria: "Comparison of each bucket's share at start and end",
    allocStart: "START",
    allocEnd: "END (2025)",
    thAsset: "Bucket",
    thStartPct: "Start",
    thEndPct: "End",
    thChangePct: "Change",
    tblTitle: "YEAR-BY-YEAR DETAIL",
    tblCaption: "Per-year asset returns, withdrawal source, and end-of-year balances",
    thYear: "Year",
    thSource: "Source",
    thWithdrawn: "Withdrawn",
    thRefill: "Refill",
    thCashBal: "Cash bal.",
    thTotal: "Total",
    thTotalChg: "Total Δ",
    srcStock: "Stocks",
    srcCash: "Cash",
    srcBoth: "Cash+Stocks",
    footer:
      "Data: calendar-year ETF total returns, dividends included (some years approximate); cash approximated by 3-month T-bills; Bitcoin data starts 2011 (0% before). For reference only — not investment advice.",
  },
} as const

/* ---------------- asset model ---------------- */
type Bucket = "stock" | "cash"

type Asset = {
  id: number
  name: string          // free text; empty → preset name
  series: SeriesKey
  customRet: string     // used when series === "custom"
  bucket: Bucket
  amount: string        // $ mode
  pct: string           // % mode
  qty: string           // coins held, used when series === "btc"
}

let NEXT_ID = 100
const newId = () => ++NEXT_ID

const DEFAULT_ASSETS = (): Asset[] => [
  { id: newId(), name: "", series: "voo", customRet: "5", bucket: "stock", amount: "2850000", pct: "75", qty: "1" },
  { id: newId(), name: "", series: "smh", customRet: "5", bucket: "stock", amount: "580000", pct: "15", qty: "1" },
  { id: newId(), name: "", series: "cash", customRet: "5", bucket: "cash", amount: "370000", pct: "10", qty: "1" },
]

const assetValue = (a: Asset, mode: "amount" | "percent", total: number): number =>
  a.series === "btc"
    ? (Number(a.qty) || 0) * BTC_START_PRICE
    : mode === "amount"
      ? Number(a.amount) || 0
      : (total * (Number(a.pct) || 0)) / 100

const seriesOf = (a: Asset): number[] =>
  a.series === "custom"
    ? Array(YEARS.length).fill(Number(a.customRet) || 0)
    : SERIES[a.series]

/* ---------------- simulation ---------------- */
type Source = "stock" | "cash" | "both"

type YearRow = {
  year: number
  rets: number[]        // per-asset return %
  vals: number[]        // per-asset end-of-year value
  source: Source
  withdrawn: number     // actual dollars removed this year (spending)
  refill: number
  cashTotal: number
  total: number
}

type SimResult = {
  rows: YearRow[]
  startVals: number[]
  initial: number
  final: number
  totalWithdrawn: number
  minCash: number | null
  depletedYear: number | null
  cagr: number
}

function simulate(
  defs: { value: number; rets: number[]; bucket: Bucket }[],
  withdraw: number, refillThreshold: number, stockUseThreshold: number,
  cashYearWithdraw: number
): SimResult {
  const vals = defs.map((d) => d.value)
  const stockIdx = defs.flatMap((d, j) => (d.bucket === "stock" ? [j] : []))
  const cashIdx = defs.flatMap((d, j) => (d.bucket === "cash" ? [j] : []))
  const sum = (idx: number[]) => idx.reduce((s, j) => s + vals[j], 0)

  // remove `amt` proportionally from the assets in `idx`; returns the shortfall
  const takeFrom = (idx: number[], amt: number): number => {
    const s = sum(idx)
    const take = Math.min(s, amt)
    if (s > 0) idx.forEach((j) => { vals[j] -= (take * vals[j]) / s })
    return amt - take
  }

  const rows: YearRow[] = []
  let minCash: number | null = cashIdx.length ? sum(cashIdx) : null
  let depletedYear: number | null = null
  let totalWithdrawn = 0

  for (let i = 0; i < YEARS.length; i++) {
    const rets = defs.map((d) => d.rets[i])
    const startStock = sum(stockIdx)
    const stockGain = stockIdx.reduce((s, j) => s + (vals[j] * rets[j]) / 100, 0)
    defs.forEach((_, j) => { vals[j] *= 1 + rets[j] / 100 })

    let source: Source
    let refill = 0

    // Rule: stock-bucket return must EXCEED the threshold to fund spending
    // from stocks; at or below it, the (separately adjustable) cash-year
    // amount is withdrawn from the cash bucket.
    const yearStockRetPct = startStock > 0 ? (stockGain / startStock) * 100 : 0
    const useCash = yearStockRetPct <= stockUseThreshold && cashIdx.length > 0
    const w = Math.min(useCash ? cashYearWithdraw : withdraw, sum(defs.map((_, j) => j)))
    totalWithdrawn += w

    if (useCash) {
      // weak stock year — spend the cash bucket, don't sell low
      source = "cash"
      const rem = takeFrom(cashIdx, w)
      if (rem > 1e-9) {
        takeFrom(stockIdx, rem)
        if (depletedYear === null) depletedYear = YEARS[i]
        source = "both"
      }
    } else {
      // gain year (or no cash assets) — withdraw from the stock bucket
      source = "stock"
      const rem = takeFrom(stockIdx, w)
      if (rem > 1e-9) takeFrom(cashIdx, rem)
      if (yearStockRetPct > refillThreshold && cashIdx.length > 0 && stockIdx.length > 0) {
        const s = sum(stockIdx)
        refill = Math.min(withdraw, s)
        if (s > 0) stockIdx.forEach((j) => { vals[j] -= (refill * vals[j]) / s })
        const c = sum(cashIdx)
        if (c > 1e-9) {
          const shares = cashIdx.map((j) => vals[j] / c)
          cashIdx.forEach((j, k) => { vals[j] += refill * shares[k] })
        } else {
          cashIdx.forEach((j) => { vals[j] += refill / cashIdx.length })
        }
      }
    }

    const cashTotal = sum(cashIdx)
    if (minCash !== null) minCash = Math.min(minCash, cashTotal)
    rows.push({
      year: YEARS[i], rets, vals: [...vals], source, withdrawn: w, refill,
      cashTotal, total: sum(defs.map((_, j) => j)),
    })
  }

  const initial = defs.reduce((s, d) => s + d.value, 0)
  const final = rows[rows.length - 1].total
  return {
    rows, startVals: defs.map((d) => d.value),
    initial, final, totalWithdrawn, minCash, depletedYear,
    cagr: initial > 0 ? (final / initial) ** (1 / YEARS.length) - 1 : 0,
  }
}

/* ---------------- formatting ---------------- */
const fmtM = (v: number) => `$${(v / 1e6).toFixed(2)}M`
const fmtK = (v: number) => (v >= 1e6 ? fmtM(v) : `$${(v / 1e3).toFixed(1)}K`)
const fmtPct = (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`
const fmtUsd = (v: number) => `$${Math.round(v).toLocaleString("en-US")}`

/* ---------------- app ---------------- */
type Mode = "amount" | "percent"

export default function App() {
  const [lang, setLang] = useState<Lang>("zh")
  const t = STR[lang]

  const [mode, setMode] = useState<Mode>("amount")
  const [assets, setAssets] = useState<Asset[]>(DEFAULT_ASSETS)
  const [total, setTotal] = useState("3800000")
  const [withdraw, setWithdraw] = useState("75000")
  const [threshold, setThreshold] = useState("30")
  const [cashUse, setCashUse] = useState("10")
  const [cashYearW, setCashYearW] = useState("75000")
  const [result, setResult] = useState<SimResult | null>(null)
  const [resultAssets, setResultAssets] = useState<Asset[]>([])   // snapshot used for labels
  const [error, setError] = useState<string | null>(null)

  const displayName = (a: Asset) => a.name.trim() || PRESET_NAMES[lang][a.series]
  // semantic colors: VOO = teal, cash-bucket assets = bright pink, rest cycle
  const colorOf = (a: Asset, i: number): DitherColor =>
    a.series === "voo" ? "teal" : a.bucket === "cash" ? "pink" : COLOR_CYCLE[i % COLOR_CYCLE.length]
  const variantOf = (i: number) => VARIANT_CYCLE[i % VARIANT_CYCLE.length]
  const keyOf = (a: Asset) => `a${a.id}`

  const patchAsset = (id: number, patch: Partial<Asset>) =>
    setAssets((xs) => xs.map((a) => (a.id === id ? { ...a, ...patch } : a)))
  const addAsset = () =>
    setAssets((xs) => [...xs, { id: newId(), name: "", series: "qqq", customRet: "5", bucket: "stock", amount: "100000", pct: "0", qty: "1" }])
  const removeAsset = (id: number) =>
    setAssets((xs) => (xs.length > 1 ? xs.filter((a) => a.id !== id) : xs))

  const pctSum = assets.filter((a) => a.series !== "btc").reduce((s, a) => s + (Number(a.pct) || 0), 0)
  const amtSum = assets.reduce((s, a) => s + assetValue(a, "amount", 0), 0)
  const eqPct = (a: Asset) =>
    amtSum > 0 ? `≈ ${(((Number(a.amount) || 0) / amtSum) * 100).toFixed(1)}%` : "≈ –%"
  const eqAmt = (a: Asset) => `≈ ${fmtUsd(((Number(total) || 0) * (Number(a.pct) || 0)) / 100)}`

  const run = () => {
    if (assets.length === 0) { setError(t.errNoAsset); return }
    const hasNonBtc = assets.some((a) => a.series !== "btc")
    if (mode === "percent" && hasNonBtc && Math.abs(pctSum - 100) > 0.01) {
      setError(t.errPct(pctSum.toFixed(1))); return
    }
    const values = assets.map((a) => assetValue(a, mode, Number(total) || 0))
    if (values.reduce((s, v) => s + v, 0) <= 0) { setError(t.errZero); return }
    setError(null)
    setResultAssets(assets.map((a) => ({ ...a })))
    setResult(simulate(
      assets.map((a, j) => ({ value: values[j], rets: seriesOf(a), bucket: a.bucket })),
      Number(withdraw) || 0, Number(threshold) || 0, Number(cashUse) || 0,
      Number(cashYearW) || 0
    ))
  }

  const reset = () => {
    setMode("amount")
    setAssets(DEFAULT_ASSETS())
    setTotal("3800000"); setWithdraw("75000"); setThreshold("30"); setCashUse("10"); setCashYearW("75000")
    setResult(null); setResultAssets([]); setError(null)
  }

  /* chart data (built from the snapshot taken at RUN time) */
  const chartConfig = useMemo(() => {
    const cfg: Record<string, { label: string; color: DitherColor }> = {}
    resultAssets.forEach((a, i) => { cfg[keyOf(a)] = { label: displayName(a), color: colorOf(a, i) } })
    return cfg
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resultAssets, lang])

  const areaData = useMemo(
    () => result?.rows.map((r) => {
      const row: Record<string, string | number> = { year: String(r.year) }
      resultAssets.forEach((a, j) => { row[keyOf(a)] = +(r.vals[j] / 1e6).toFixed(3) })
      return row
    }) ?? [],
    [result, resultAssets]
  )

  const barData = useMemo(() => {
    if (!result) return []
    let prev = result.initial
    return result.rows.map((r) => {
      const ret = +((100 * (r.total - prev)) / prev).toFixed(2)
      prev = r.total
      return { year: String(r.year), pos: ret >= 0 ? ret : 0, neg: ret < 0 ? ret : 0 }
    })
  }, [result])
  const barConfig = useMemo(() => ({
    pos: { label: t.sRetPos, color: "ink" as const },
    neg: { label: t.sRetNeg, color: "grey" as const },
  }), [t])

  const pieStart = useMemo(() => result
    ? resultAssets.map((a, j) => ({ bucket: keyOf(a), value: +(result.startVals[j] / 1e6).toFixed(3) }))
    : [], [result, resultAssets])
  const pieEnd = useMemo(() => {
    if (!result) return []
    const last = result.rows[result.rows.length - 1]
    return resultAssets.map((a, j) => ({ bucket: keyOf(a), value: +(last.vals[j] / 1e6).toFixed(3) }))
  }, [result, resultAssets])

  const allocRows = useMemo(() => {
    if (!result) return []
    const last = result.rows[result.rows.length - 1]
    const s = result.initial || 1
    const e = last.total || 1
    return resultAssets.map((a, j) => ({
      key: keyOf(a),
      name: displayName(a),
      color: colorOf(a, j),
      startPct: (100 * result.startVals[j]) / s,
      endPct: (100 * last.vals[j]) / e,
      startAmt: result.startVals[j],
      endAmt: last.vals[j],
    }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, resultAssets, lang])

  const srcLabel: Record<Source, string> = {
    stock: t.srcStock, cash: t.srcCash, both: t.srcBoth,
  }

  const hint: CSSProperties = { margin: "4px 0 0", fontSize: 18, color: "#3f3f46" }

  return (
    <div lang={lang === "zh" ? "zh-CN" : "en"} style={{ maxWidth: 1280, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 10 }}>
      {/* header */}
      <header className="pxw" style={{ marginBottom: 32 }}>
        <div className="pxw-title">
          <span>{t.winTitle}</span>
          <span style={{ flex: 1 }} aria-hidden="true"></span>
          <div role="group" aria-label="Language / 语言" style={{ display: "flex", gap: 12, background: "#e0e0e0", padding: "4px 8px" }}>
            <button type="button" className="pxtab" style={{ padding: "2px 10px", fontSize: 17, display: "flex", alignItems: "center", gap: 6 }}
              aria-pressed={lang === "zh"} onClick={() => setLang("zh")}>
              {lang === "zh" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a", flexShrink: 0 }} />}中文
            </button>
            <button type="button" className="pxtab" style={{ padding: "2px 10px", fontSize: 17, display: "flex", alignItems: "center", gap: 6 }}
              aria-pressed={lang === "en"} onClick={() => setLang("en")}>
              {lang === "en" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a", flexShrink: 0 }} />}EN
            </button>
          </div>
        </div>
        <div className="pxw-body">
          <h1 style={{ margin: 0, fontSize: "clamp(31px,5vw,52px)", lineHeight: 1.1 }}>{t.title}</h1>
          <p style={{ margin: "8px 0 0", color: "#3f3f46" }}>{t.subtitle}</p>
        </div>
      </header>

      {/* inputs */}
      <section className="pxw" style={{ marginBottom: 32 }} aria-labelledby="cfg-h">
        <div className="pxw-title"><span id="cfg-h">{t.config}</span></div>
        <div className="pxw-body">
          <fieldset className="pxfs">
            <legend>{t.groupAssets}</legend>
            <div role="group" aria-label={t.modeGroup} style={{ display: "flex", gap: 16, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="pxtab" style={{ display: "flex", alignItems: "center", gap: 6 }} aria-pressed={mode === "amount"} onClick={() => setMode("amount")}>
                {mode === "amount" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a", flexShrink: 0 }} />}{t.modeAmount}
              </button>
              <button type="button" className="pxtab" style={{ display: "flex", alignItems: "center", gap: 6 }} aria-pressed={mode === "percent"} onClick={() => setMode("percent")}>
                {mode === "percent" && <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0a0a0a", flexShrink: 0 }} />}{t.modePercent}
              </button>
              {mode === "percent" && (
                <span style={{ marginLeft: "auto", minWidth: 220 }}>
                  <label className="px-label" htmlFor="in-total">{t.totalAmt}</label>
                  <input id="in-total" className="pxin px-num" type="number" min="0" step="10000" value={total}
                    onChange={(e) => setTotal(e.target.value)} />
                </span>
              )}
            </div>

            <div className="asset-list">
              {assets.map((a, i) => (
                <div className="asset-row" key={a.id}>
                  <div>
                    <label className="px-label" htmlFor={`nm-${a.id}`}>{t.thName}</label>
                    <input id={`nm-${a.id}`} className="pxin" type="text" value={a.name}
                      placeholder={PRESET_NAMES[lang][a.series]}
                      onChange={(e) => patchAsset(a.id, { name: e.target.value })} />
                  </div>
                  <div>
                    <label className="px-label" htmlFor={`sr-${a.id}`}>{t.thSeries}</label>
                    <select id={`sr-${a.id}`} className="pxin" value={a.series}
                      onChange={(e) => {
                        const series = e.target.value as SeriesKey
                        patchAsset(a.id, { series, bucket: series === "cash" || series === "tlt" ? "cash" : a.bucket })
                      }}>
                      {(Object.keys(PRESET_NAMES[lang]) as SeriesKey[]).map((k) => (
                        <option key={k} value={k}>{PRESET_NAMES[lang][k]}</option>
                      ))}
                    </select>
                  </div>
                  {a.series === "custom" && (
                    <div>
                      <label className="px-label" htmlFor={`cr-${a.id}`}>{t.customRate}</label>
                      <input id={`cr-${a.id}`} className="pxin px-num" type="number" step="0.1" value={a.customRet}
                        onChange={(e) => patchAsset(a.id, { customRet: e.target.value })} />
                    </div>
                  )}
                  <div>
                    <label className="px-label" htmlFor={`bk-${a.id}`}>{t.thBucket}</label>
                    <select id={`bk-${a.id}`} className="pxin" value={a.bucket}
                      onChange={(e) => patchAsset(a.id, { bucket: e.target.value as Bucket })}>
                      <option value="stock">{t.bucketStock}</option>
                      <option value="cash">{t.bucketCash}</option>
                    </select>
                  </div>
                  <div>
                    <label className="px-label" htmlFor={`al-${a.id}`}>
                      {a.series === "btc" ? t.btcQty : `${t.thAlloc} ${mode === "amount" ? "($)" : "(%)"}`}
                    </label>
                    {a.series === "btc" ? (
                      <>
                        <input id={`al-${a.id}`} className="pxin px-num" type="number" min="0" step="0.1" value={a.qty}
                          onChange={(e) => patchAsset(a.id, { qty: e.target.value })} aria-describedby={`eq-${a.id}`} />
                        <p id={`eq-${a.id}`} className="px-num" style={hint} aria-live="polite">
                          {t.btcHint(`$${((Number(a.qty) || 0) * BTC_START_PRICE).toFixed(2)}`, fmtK((Number(a.qty) || 0) * BTC_END_PRICE))}
                        </p>
                      </>
                    ) : mode === "amount" ? (
                      <>
                        <input id={`al-${a.id}`} className="pxin px-num" type="number" min="0" step="10000" value={a.amount}
                          onChange={(e) => patchAsset(a.id, { amount: e.target.value })} aria-describedby={`eq-${a.id}`} />
                        <p id={`eq-${a.id}`} className="px-num" style={hint} aria-live="polite">{eqPct(a)}</p>
                      </>
                    ) : (
                      <>
                        <input id={`al-${a.id}`} className="pxin px-num" type="number" min="0" max="100" value={a.pct}
                          onChange={(e) => patchAsset(a.id, { pct: e.target.value })} aria-describedby={`eq-${a.id}`} />
                        <p id={`eq-${a.id}`} className="px-num" style={hint} aria-live="polite">{eqAmt(a)}</p>
                      </>
                    )}
                  </div>
                  <div style={{ alignSelf: "end" }}>
                    <span className="swatch-dot" style={{ background: `var(--sw-${colorOf(a, i)})` }} aria-hidden="true"></span>
                    <button type="button" className="pxbtn-danger" style={{ padding: "8px 12px", fontSize: 18 }}
                      onClick={() => removeAsset(a.id)} disabled={assets.length <= 1}
                      aria-label={t.removeAria(displayName(a))}>
                      {t.removeAsset}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 16, marginTop: 20, flexWrap: "wrap", alignItems: "center" }}>
              <button type="button" className="pxtab" onClick={addAsset}>{t.addAsset}</button>
              {mode === "amount" ? (
                <span className="px-num" style={{ color: "#3f3f46" }} aria-live="polite">
                  {t.totalAmt.replace(" ($)", "")}: {fmtUsd(amtSum)} = 100%
                </span>
              ) : (
                <span className="px-num" style={{ color: Math.abs(pctSum - 100) > 0.01 ? "#b3261e" : "#3f3f46" }} aria-live="polite">
                  {t.pctSum}: {pctSum.toFixed(1)}%{Math.abs(pctSum - 100) > 0.01 ? t.need100 : " ✓"}
                </span>
              )}
            </div>
          </fieldset>

          <fieldset className="pxfs" style={{ marginTop: 16 }}>
            <legend>{t.groupStrategy}</legend>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
              <div>
                <label className="px-label" htmlFor="in-w">{t.withdraw}</label>
                <input id="in-w" className="pxin px-num" type="number" min="0" step="5000" value={withdraw}
                  onChange={(e) => setWithdraw(e.target.value)} />
                <p className="px-num" style={hint}>&nbsp;</p>
              </div>
              <div>
                <label className="px-label" htmlFor="in-th">{t.threshold}</label>
                <input id="in-th" className="pxin px-num" type="number" min="0" max="100" step="1" value={threshold}
                  onChange={(e) => setThreshold(e.target.value)} aria-describedby="eq-th" />
                <p id="eq-th" className="px-num" style={hint} aria-live="polite">{t.thresholdHint(threshold || "0")}</p>
              </div>
              <div>
                <label className="px-label" htmlFor="in-cu">{t.cashUse}</label>
                <input id="in-cu" className="pxin px-num" type="number" min="-100" max="100" step="1" value={cashUse}
                  onChange={(e) => setCashUse(e.target.value)} aria-describedby="eq-cu" />
                <p id="eq-cu" className="px-num" style={hint} aria-live="polite">{t.cashUseHint(cashUse || "0")}</p>
              </div>
              <div>
                <label className="px-label" htmlFor="in-cyw">{t.cashYearW}</label>
                <input id="in-cyw" className="pxin px-num" type="number" min="0" step="5000" value={cashYearW}
                  onChange={(e) => setCashYearW(e.target.value)} aria-describedby="eq-cyw" />
                <p id="eq-cyw" className="px-num" style={hint} aria-live="polite">{t.cashYearWHint(fmtUsd(Number(cashYearW) || 0))}</p>
              </div>
            </div>
          </fieldset>

          {error && (
            <p role="alert" style={{ margin: "10px 0 0", color: "#b3261e", fontWeight: 700 }}>✕ {error}</p>
          )}

          <div style={{ display: "flex", gap: 16, marginTop: 28, flexWrap: "wrap", alignItems: "center" }}>
            <DitherButton color="grey" variant="solid" onClick={run} style={{ fontSize: 21, padding: "14px 32px", fontWeight: 700, color: "#ffffff", background: "#0a0a0a" }}>
              {t.run}
            </DitherButton>
            <button type="button" className="pxbtn-danger" onClick={reset}>
              {t.reset}
            </button>
          </div>
        </div>
      </section>

      {result && (
        <>
          {/* metrics */}
          <section aria-label={t.metricsAria} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 24, marginBottom: 32 }}>
            {[
              {
                l: t.mFinal, v: fmtM(result.final), s: t.mGrowth((result.final / result.initial).toFixed(2)),
                spark: result.rows.map((r) => +(r.total / 1e6).toFixed(3)), sparkColor: "green" as const,
              },
              { l: t.mReturn, v: fmtPct((100 * (result.final - result.initial)) / result.initial), s: t.mCagr(fmtPct(result.cagr * 100)) },
              { l: t.mWithdrawn, v: fmtM(result.totalWithdrawn), s: t.mPerYear(fmtK(Number(withdraw) || 0)) },
              {
                l: t.mMinCash,
                v: result.minCash === null ? "—" : fmtK(result.minCash),
                s: result.minCash === null ? t.mNoCash
                  : result.depletedYear ? t.mDepleted(result.depletedYear) : t.mNeverOut,
                spark: result.minCash === null ? undefined : result.rows.map((r) => +(r.cashTotal / 1e3).toFixed(1)),
                sparkColor: "pink" as const,
              },
            ].map((m) => (
              <div key={m.l} className="pxw" style={{ padding: 16, textAlign: "center" }}>
                <div className="px-label">{m.l}</div>
                <div className="metric-v px-num">{m.v}</div>
                <div style={{ fontSize: 18, color: "#3f3f46" }}>{m.s}</div>
                {"spark" in m && m.spark && (
                  <div style={{ height: 40, marginTop: 8 }} aria-hidden="true">
                    <Sparkline data={m.spark} color={m.sparkColor!} bloom="aura" />
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* charts */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(480px,100%), 1fr))", gap: 24, marginBottom: 32 }}>
            <section className="pxw" aria-label={t.chart1Aria}>
              <div className="pxw-title"><span>{t.chart1}</span></div>
              <div className="pxw-body chart-scroll">
                <div style={{ minWidth: 560, height: 320 }}>
                {/* Teal area uses hatched pattern, others use gradient */}
                <AreaChart data={areaData} config={chartConfig} stackType="stacked" bloom={{ blur: 0, brightness: 1.35, opacity: 0.35, saturate: 1.4 }}>
                  <Grid />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v: number) => `$${v}M`} />
                  <Legend isClickable />
                  <Tooltip labelKey="year" />
                  {resultAssets.map((a, i) => (
                    <Area key={a.id} dataKey={keyOf(a)} variant={a.series === "voo" ? "hatched" : "gradient"} />
                  ))}
                </AreaChart>
                </div>
              </div>
            </section>
            <section className="pxw" aria-label={t.chart2Aria}>
              <div className="pxw-title"><span>{t.chart2}</span></div>
              <div className="pxw-body chart-scroll">
                <div style={{ minWidth: 560, height: 320 }}>
                <BarChart data={barData} config={barConfig} bloom={{ blur: 3, brightness: 1.35, opacity: 0.3, saturate: 1.4 }}>
                  <Grid />
                  <XAxis dataKey="year" />
                  <YAxis tickFormatter={(v: number) => `${v}%`} />
                  <Tooltip labelKey="year" />
                  <Bar dataKey="pos" variant="solid" />
                  <Bar dataKey="neg" variant="hatched" />
                </BarChart>
                </div>
              </div>
            </section>
          </div>

          {/* start vs end allocation */}
          <section className="pxw" style={{ marginBottom: 32 }} aria-label={t.allocAria}>
            <div className="pxw-title"><span>{t.allocTitle}</span></div>
            <div className="pxw-body">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px,100%), 1fr))", gap: 24 }}>
                <div>
                  <p className="px-label" style={{ textAlign: "center", margin: "0 0 8px" }}>{t.allocStart}</p>
                  <div style={{ height: 240 }}>
                    <PieChart data={pieStart} config={chartConfig} dataKey="value" nameKey="bucket" innerRadius={0.5} bloom={{ blur: 0, brightness: 1.35, opacity: 0.35, saturate: 1.4 }}>
                      <Legend align="center" />
                      <Tooltip />
                      <Pie variant="dotted" />
                    </PieChart>
                  </div>
                </div>
                <div>
                  <p className="px-label" style={{ textAlign: "center", margin: "0 0 8px" }}>{t.allocEnd}</p>
                  <div style={{ height: 240 }}>
                    <PieChart data={pieEnd} config={chartConfig} dataKey="value" nameKey="bucket" innerRadius={0.5} bloom={{ blur: 0, brightness: 1.35, opacity: 0.35, saturate: 1.4 }}>
                      <Legend align="center" />
                      <Tooltip />
                      <Pie variant="dotted" />
                    </PieChart>
                  </div>
                </div>
              </div>
              <div style={{ overflowX: "auto", marginTop: 24 }}>
                <table className="pxtable px-num">
                  <caption className="sr-only">{t.allocAria}</caption>
                  <thead>
                    <tr>
                      <th scope="col">{t.thAsset}</th>
                      <th scope="col">{t.thStartPct}</th>
                      <th scope="col">{t.thEndPct}</th>
                      <th scope="col">{t.thChangePct}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocRows.map((r) => {
                      const d = r.endPct - r.startPct
                      return (
                        <tr key={r.key}>
                          <td><span className="swatch-dot" style={{ background: `var(--sw-${r.color})` }} aria-hidden="true"></span>{r.name}</td>
                          <td>{r.startPct.toFixed(1)}% ({fmtK(r.startAmt)})</td>
                          <td>{r.endPct.toFixed(1)}% ({fmtK(r.endAmt)})</td>
                          <td>{d < 0
                            ? <span className="neg-chip">{d.toFixed(1)} pp</span>
                            : <span className="pos-val">+{d.toFixed(1)} pp</span>}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </section>

          {/* year-by-year table */}
          <section className="pxw" style={{ marginBottom: 32 }} aria-labelledby="tbl-h">
            <div className="pxw-title"><span id="tbl-h">{t.tblTitle}</span></div>
            <div className="pxw-body" style={{ padding: "32px 0", overflowX: "auto", maxHeight: 520, overflowY: "auto" }}>
              <table className="pxtable px-num">
                <caption className="sr-only">{t.tblCaption}</caption>
                <thead>
                  <tr>
                    <th scope="col">{t.thYear}</th>
                    {resultAssets.map((a, i) => (
                      <th scope="col" key={a.id}>
                        <span className="swatch-dot swatch-dot--ondark" style={{ background: `var(--sw-${colorOf(a, i)})` }} aria-hidden="true"></span>
                        {displayName(a)}
                      </th>
                    ))}
                    <th scope="col">{t.thSource}</th><th scope="col">{t.thWithdrawn}</th><th scope="col">{t.thRefill}</th>
                    <th scope="col">{t.thCashBal}</th><th scope="col">{t.thTotal}</th><th scope="col">{t.thTotalChg}</th>
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((r, i) => {
                    const prev = i === 0 ? result.initial : result.rows[i - 1].total
                    const chg = prev > 0 ? (100 * (r.total - prev)) / prev : 0
                    return (
                      <tr key={r.year} className={r.source !== "stock" ? "row-dither" : undefined}>
                        <td>{r.year}</td>
                        {resultAssets.map((a, j) => (
                          <td key={a.id}>{r.rets[j] < 0
                            ? <span className="neg-chip">{fmtPct(r.rets[j])}</span>
                            : <span className="pos-val">{fmtPct(r.rets[j])}</span>}
                          </td>
                        ))}
                        <td>{srcLabel[r.source]}</td>
                        <td>−{fmtK(r.withdrawn)}</td>
                        <td>{r.refill > 0 ? <span className="refill-chip">✚ {fmtK(r.refill)}</span> : "–"}</td>
                        <td>{result.minCash === null ? "—" : fmtK(r.cashTotal)}</td>
                        <td>{fmtM(r.total)}</td>
                        <td>{chg < 0 ? <span className="neg-chip">{fmtPct(chg)}</span> : <span className="pos-val">{fmtPct(chg)}</span>}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <footer style={{ textAlign: "center", padding: "16px 0 32px", color: "#3f3f46", fontSize: 18 }}>
        {t.footer}
        <br />CHARTS: DITHER-KIT · PIXEL EDITION
      </footer>
    </div>
  )
}
