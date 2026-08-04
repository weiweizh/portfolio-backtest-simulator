# Portfolio Backtest Simulator

A beautiful, interactive portfolio backtest simulator with a retro pixel-art aesthetic. Build your own asset allocation, define withdrawal strategies, and backtest 20 years of actual historical returns (2006–2025) for real ETFs and asset classes.

![Portfolio Backtest Simulator](https://img.shields.io/badge/React-18-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue) ![License](https://img.shields.io/badge/License-MIT-green)

## Quick Start

Test your investment strategy using 20 years of real market data. Here's how it works:

1. **Add your assets** — Choose from real ETFs (S&P 500, semiconductors, gold, treasuries, Bitcoin) or create custom investments
2. **Set your withdrawal plan** — Define how much you want to spend each year
3. **Configure your safety net** — Set cash reserve thresholds to protect against market downturns
4. **Run the backtest** — See exactly how your portfolio would have performed from 2006 to 2025

The simulator shows you year-by-year results, whether your cash reserves hold up, and provides detailed metrics to help you plan your financial future.

## Features

### 📊 Interactive Portfolio Builder
- **Multiple asset classes**: S&P 500 (VOO), Semiconductors (SMH), Nasdaq-100 (QQQ), Gold (GLD), Long-term Treasuries (TLT), Bitcoin (BTC), Cash/T-Bills, or custom fixed-return assets
- **Flexible allocation**: Switch between dollar amount and percentage-based allocation modes
- **Dynamic asset management**: Add, remove, or edit assets on the fly
- **Real historical data**: 20 years of actual annual total returns (2006–2025)

### 💰 Cash Bucket Strategy
The simulator implements a sophisticated withdrawal strategy:
- **Dual-bucket model**: Separate stock and cash buckets
- **Smart withdrawal rules**: 
  - When stock returns exceed the withdrawal threshold → withdraw from stocks
  - When stock returns fall below threshold → preserve capital by withdrawing from cash
- **Automatic refill**: When stock returns exceed the increase trigger, move additional cash reserves into the bucket
- **Sustainability analysis**: Track whether cash bucket survives the full 20-year period

### 📈 Rich Visualizations
- **Stacked area chart**: Assets composition over time with smooth dithered gradients
- **Annual returns bar chart**: Year-by-year net portfolio changes
- **Allocation pie charts**: Compare starting vs. ending allocation percentages
- **Year-by-year detail table**: Drill down into each year's performance, withdrawal source, and balances
- **Dithered pixel aesthetic**: Retro-style charts with ordered Bayer dithering patterns

### 📊 Comprehensive Metrics
- **Final total assets**: Projected portfolio value at end of 2025
- **Growth multiplier**: How many times your initial investment grew
- **Cumulative return**: Total percentage gain over 20 years
- **CAGR**: Compound annual growth rate
- **Total withdrawn**: Sum of all spending over 20 years
- **Cash bucket health**: Minimum cash reserves reached and whether cash depletes

### 🌍 Bilingual Interface
- **English** and **中文 (Chinese)** support
- Full i18n for all labels, hints, and descriptions
- Toggle language with the header button

### ♿ Accessibility
- ARIA labels and live regions for dynamic content
- Semantic HTML structure
- Keyboard-navigable controls
- Screen reader friendly

## Getting Started

### Prerequisites
- Node.js 16+ and npm/yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/weiweizh/portfolio-backtest-simulator.git
cd portfolio-backtest-simulator

# Install dependencies
npm install

# Start the development server
npm run dev
```

The app will be available at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

Output will be in the `dist/` directory.

## How to Use

### 1. Configure Your Portfolio

**Asset Allocation Section:**
- Choose allocation mode: **$ AMOUNT** for absolute dollars or **% PERCENT** for percentages
- Add assets using the "+ ADD ASSET" button
- For each asset, specify:
  - **Name** (optional; displays preset name if left blank)
  - **Data series** (historical returns to use)
  - **Bucket** (Stock or Cash) — determines withdrawal priority
  - **Allocation** (dollars or percent, depending on mode)
- Remove assets with the ✕ button (at least one asset required)

**Special Asset Types:**
- **Bitcoin**: Enter quantity in coins; calculator shows approximate 2011 start value and 2025 end value
- **Custom returns**: Create an asset with fixed annual return rate (useful for bonds, real estate, etc.)

### 2. Define Withdrawal Strategy

**Withdrawal & Refill Strategy Section:**
- **Annual spending**: Fixed amount withdrawn each year for expenses
- **Stock-withdrawal threshold** (%)**: When stock bucket return exceeds this, withdraw from stocks; otherwise use cash
- **Cash-year withdrawal** ($): The amount withdrawn from cash in years when stock return is below threshold
- **Increase trigger** (%): When stock return exceeds this, move one year of spending into the cash bucket as a buffer

### 3. Run Backtest

Click **► RUN BACKTEST** to simulate 20 years. The simulator will calculate:
- Year-by-year portfolio values and returns
- Whether cash reserves are sufficient
- Optimal withdrawal source each year
- Final metrics and growth summary

Click **✕ RESET** to clear results and start over.

### 4. Analyze Results

**Metrics Cards** show:
- Final portfolio value and growth multiple
- Cumulative return and CAGR
- Total withdrawn and annual average
- Cash bucket status with a sparkline trend

**Charts** visualize:
- Asset composition over time (stacked area)
- Annual returns (positive/negative bars)
- Allocation shift from start to end (pie charts)

**Year-by-Year Table** provides detailed breakdown:
- Each asset's annual return percentage
- Withdrawal source (stocks, cash, or both)
- Refill activity
- Running balances for cash bucket and total portfolio

## Data Sources

### Historical Returns (2006–2025)

| Asset | Series | Source |
|-------|--------|--------|
| **VOO** | S&P 500 | Vanguard VOO ETF / CRSP total return |
| **SMH** | Semiconductors | VanEck Semiconductor ETF |
| **QQQ** | Nasdaq-100 | Invesco QQQ (approx.) |
| **GLD** | Gold | SPDR Gold Shares |
| **TLT** | 20+Y Treasuries | iShares 20+ Year Treasury |
| **BTC** | Bitcoin (USD) | BTC/USD spot rate; ~$0.30 start of 2011 |
| **Cash** | 3-month T-bills | 3-month US Treasury Bill rates |

- All returns are **calendar-year total returns** including dividends
- Some historical approximations used
- Bitcoin data starts 2011 (0% used for pre-2011 years)
- **For reference only — not investment advice**

## Technology Stack

- **React 18** — UI framework
- **TypeScript** — Type safety
- **Vite** — Build tool and dev server
- **Dither-kit** — Custom charting library with dithered rendering
- **Canvas** — Pixel-perfect dithered visualizations
- **Recharts** (inspiration) — Chart data structures

## Project Structure

```
.
├── src/
│   ├── App.tsx                          # Main app component with simulation logic
│   ├── components/
│   │   └── dither-kit/
│   │       ├── area-chart.tsx           # Stacked area chart
│   │       ├── bar-chart.tsx            # Bar chart
│   │       ├── pie-chart.tsx            # Donut/pie chart
│   │       ├── dither-paint.ts          # Canvas dithering engine
│   │       └── ...                      # Other chart components
│   ├── index.css                        # Global styles
│   └── index.html                       # HTML template
├── portfolio-sim/                       # Alternative project structure
├── pixel.css                            # Pixel design system
├── vite.config.ts                       # Vite configuration
└── tsconfig.json                        # TypeScript configuration
```

## Performance Considerations

- Backtest simulation: O(n*m) where n=20 years, m=number of assets
- All calculations run in-browser (no server calls)
- Charts render via Canvas for crisp dithered effect
- Memoized chart data prevents unnecessary recalculations

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (responsive design)

## Customization

### Adding New Asset Series

Edit `src/App.tsx`:

1. Add return data to `SERIES`:
   ```typescript
   const SERIES: Record<Exclude<SeriesKey, "custom">, number[]> = {
     // ... existing series ...
     myAsset: [5.2, 8.1, -3.5, ...], // 20 years of returns
   }
   ```

2. Add name in `PRESET_NAMES`:
   ```typescript
   const PRESET_NAMES: Record<Lang, Record<SeriesKey, string>> = {
     en: { ..., myAsset: "My Asset" },
     zh: { ..., myAsset: "我的资产" },
   }
   ```

3. Add the new asset type to `SeriesKey` union type

### Changing Chart Styles

Edit `src/components/dither-kit/` for dither patterns, colors, and bloom effects.

## Known Limitations

- Bitcoin historical data is limited (starts 2011)
- Some historical return approximations for older years
- Simulator assumes annual rebalancing
- Does not account for taxes or inflation
- Does not include transaction costs

## Contributing

Contributions are welcome! Please feel free to:
- Report bugs via GitHub issues
- Suggest new features
- Submit pull requests for improvements
- Improve documentation or translations

## License

MIT License — See LICENSE file for details

## Author

Built with ❤️ by [@weiweizh](https://github.com/weiweizh)

## Disclaimer

**This tool is for educational and reference purposes only.** It is not investment advice. Past performance does not guarantee future results. Always consult with a qualified financial advisor before making investment decisions.

Historical data is approximate and sourced from public records. Use at your own risk.

---

**Version**: 1.0  
**Last Updated**: August 4, 2026  
**Status**: Active Development
