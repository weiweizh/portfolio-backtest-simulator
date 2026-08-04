// Shared ordered-dither painting primitives, used by every cartesian canvas
// (area, line, bar). Keeping the Bayer threshold loop in one place means every
// chart type reads with the exact same pixel texture.

import type { AreaVariant } from "./chart-context"
import { rgb, type Seed } from "./palette"

// 4×4 ordered (Bayer) matrix, normalized to 0–1 thresholds — the exact matrix
// the legacy chart dithers with.
export const BAYER = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => (v + 0.5) / 16))

// 8×8 ordered (Bayer) matrix for smoother gradients with finer detail
export const BAYER8 = [
  [0, 32, 8, 40, 2, 34, 10, 42],
  [48, 16, 56, 24, 50, 18, 58, 26],
  [12, 44, 4, 36, 14, 46, 6, 38],
  [60, 28, 52, 20, 62, 30, 54, 22],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
].map((row) => row.map((v) => (v + 0.5) / 64))

export const CELL = 2 // css px per dither cell — chunky enough to read pixelated
export const MAX_COLS = 520
export const MAX_ROWS = 200
// Opacity of the top border outline (just under solid, so it reads as a soft
// edge rather than a hard line). See the note on colour vs opacity below.
export const BORDER_ALPHA = 0.72
// Opacity of a dither "off" cell relative to an "on" cell. The scatter modulates
// between these two tiers of the *same* colour instead of leaving holes, so the
// background never shows through as stark white on a light theme.
export const OFF_TIER = 0.4

export type PaintOpts = {
  variant: AreaVariant
  intensity: number // 0–1 hover lift
  dim: number // selection dim multiplier (0.3 dimmed, 1 normal)
  stacked: boolean // denser + solid floor when layers stack
  sparse?: number // raise the dither threshold (thin out) — front layers
}

// Colour vs opacity — the guiding rule for the whole engine:
//
//   Work with opacities instead of different shades of the same color. This will
//   make sure it looks good on both light and dark mode.
//
// So every pixel is the series' single `fill` colour and we vary only its alpha.
// The old lighter `line` / near-white `star` shades were dropped: a shade that
// pops on a dark background reads as a jarring bright speck on a light one, while
// the same colour at a lower opacity simply blends into whatever sits behind it.

/**
 * Fill one backing-canvas column `x` from row `top` down to `floor` with the
 * ordered-dither scatter — solid at the floor, dissolving upward so it *fades
 * out toward the value line* — then cap the top with a soft border outline in
 * the series colour. Density drives opacity (see the note above), so the fade
 * reads correctly against both light and dark backgrounds. The single source of
 * the dither look across area / line / bar.
 *
 * Enhanced with Bayer8 for smoother gradients and improved visual patterns.
 */
export function paintColumn(
  octx: CanvasRenderingContext2D,
  x: number,
  top: number,
  floor: number,
  seed: Seed,
  { variant, intensity, dim, stacked, sparse = 0 }: PaintOpts
) {
  const t = Math.round(top)
  const f = Math.round(floor)
  const depth = f - t

  // Debug log on first call for each variant
  if (x === 0 && t === 0) {
    console.log(`paintColumn called: variant=${variant}, depth=${depth}, stacked=${stacked}`)
  }

  if (depth <= 0) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
    octx.fillRect(x, t, 1, 1)
    return
  }
  // Reduce bias for gradient variant to show dither patterns more clearly
  const stackBias = variant === "gradient" ? 0.05 : (stacked ? 0.2 : 0)
  const bias = (variant === "dotted" ? (stacked ? 0.5 : 0.12) : 0) + stackBias - sparse

  for (let y = t; y < f; y++) {
    // Inverted falloff: 0 at the top line, 1 at the floor — dense at the
    // bottom, thinning as it rises toward the outline.
    let density = (y - t) / depth
    // For gradient: use relative Y position within this area (0 at top, 1 at bottom) for proper fade effect
    const gradientDensity = variant === "gradient" ? ((y - t) / depth) : density
    if (stacked && variant !== "gradient") density = 0.88 + 0.12 * density
    if (variant === "hatched" && ((x + y) & 3) >= 2) continue

    // Use Bayer8 for smoother gradients, Bayer4 for punchier patterns
    const bayerMatrix = variant === "gradient" ? BAYER8 : BAYER
    const bayerY = variant === "gradient" ? y & 7 : y & 3
    const bayerX = variant === "gradient" ? x & 7 : x & 3

    // For gradient variant: skip dither, use pure opacity fade
    // For other variants: use Bayer threshold
    let lit: boolean
    if (variant === "gradient") {
      // Gradient: paint every pixel, vary opacity only
      lit = true
    } else {
      const ditheryDensity = density
      lit =
        variant === "solid" ||
        ditheryDensity > bayerMatrix[bayerY][bayerX] - 0.1 * intensity - bias
    }
    // "dotted" keeps real gaps for its open look; every other variant covers
    // the cell and lets the dither ride the alpha (on = full tier, off = a
    // faint tint) so nothing shows the background through as white.
    if (variant === "dotted" && !lit) continue

    // For gradient variant: use full color but with dramatic opacity fade
    let fillColor = seed.fill
    let alphaMultiplier = 1
    if (variant === "gradient") {
      // Keep color at full saturation, just vary opacity dramatically
      // Opacity: 15% at top → 100% at bottom (smooth pronounced fade)
      alphaMultiplier = 0.15 + gradientDensity * 0.85
    } else if (variant === "hatched") {
      // Hatched: slightly boosted at mid-tones for visual pop
      alphaMultiplier = 0.9 + 0.1 * Math.sin(intensity * Math.PI)
    } else if (variant === "dotted") {
      // Dotted: enhanced with bloom-like effect through opacity modulation
      alphaMultiplier = 1.0 + 0.15 * intensity
    }

    // Density → alpha (see the colour-vs-opacity note above).
    const k = (0.3 + density * 0.7) * (1 + 0.22 * intensity)
    // For gradient variant, use gradientDensity to calculate k as well for consistent fade
    const kForAlpha = variant === "gradient" ? (0.3 + gradientDensity * 0.7) * (1 + 0.22 * intensity) : k
    const alpha = clamp01((lit ? kForAlpha : kForAlpha * OFF_TIER) * dim * alphaMultiplier)

    // Debug: log opacity for gradient variant at specific positions
    if (variant === "gradient" && x === 50 && (y === t || y === Math.floor((t + f) / 2) || y === f - 1)) {
      console.log(`Gradient [x=${x}, y=${y}, t=${t}, f=${f}]: density=${gradientDensity.toFixed(2)}, kForAlpha=${kForAlpha.toFixed(2)}, multiplier=${alphaMultiplier.toFixed(2)}, dim=${dim.toFixed(2)}, alpha=${alpha.toFixed(2)}`)
    }

    octx.fillStyle = rgb(fillColor, 1, alpha)
    octx.fillRect(x, y, 1, 1)
  }
  // Top border outline — the shape's edge now that the fill fades out here.
  // Enhanced feathering for smoother visual transition.
  octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * dim)
  octx.fillRect(x, t, 1, 1)
  if (depth > 1) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.5 * dim)
    octx.fillRect(x, t + 1, 1, 1)
  }
  if (depth > 2) {
    octx.fillStyle = rgb(seed.fill, 1, BORDER_ALPHA * 0.25 * dim)
    octx.fillRect(x, t + 2, 1, 1)
  }
}

/** Linear-resample a per-index fraction array to `cols` columns. */
export function resample(src: number[], cols: number): number[] {
  const out = new Array<number>(cols)
  const last = Math.max(src.length - 1, 1)
  for (let c = 0; c < cols; c++) {
    const t = (c / Math.max(cols - 1, 1)) * last
    const i = Math.floor(t)
    const f = t - i
    const a = src[i] ?? 0
    const b = src[Math.min(i + 1, src.length - 1)] ?? a
    out[c] = a + (b - a) * f
  }
  return out
}

/** Backing-canvas resolution for a plot rect — low-res, scaled up `pixelated`. */
export function backingSize(width: number, height: number) {
  return {
    cols: Math.min(MAX_COLS, Math.max(8, Math.round(width / CELL))),
    rows: Math.min(MAX_ROWS, Math.max(8, Math.round(height / CELL))),
  }
}

// Bloom — a real "shader" glow that comes from the colours themselves: a blurred
// copy of the rendered canvas, composited additively (`plus-lighter`) so each
// hue blooms in its own colour instead of a grey wash. Lives on a second canvas
// layered over the crisp one (which stays sharp/pixelated).
export type BloomLevel = "off" | "low" | "high" | "aura"
export type BloomBlend = "plus-lighter" | "screen" | "lighten"
export type BloomConfig = {
  blur: number // px
  brightness: number // 1 = none
  opacity: number // 0–1
  /** Saturation of the glow — >1 keeps it vividly in the dither's colour
   * instead of washing toward white. */
  saturate?: number
  blend?: BloomBlend // additive by default
}
/** A preset name, a full config, or "off". */
export type BloomInput = BloomLevel | BloomConfig

const PRESET: Record<Exclude<BloomLevel, "off">, BloomConfig> = {
  low: { blur: 0, brightness: 1.4, opacity: 0.35, saturate: 1.5 },
  high: { blur: 8, brightness: 1.6, opacity: 0.85, saturate: 1.8 },
  aura: { blur: 18, brightness: 3.1, opacity: 0.15, saturate: 3.2 },
}

export type BloomStyle = {
  filter: string
  opacity: number
  mixBlendMode: BloomBlend
  imageRendering: "auto"
}

/** Style for the bloom *layer* canvas (a blurred, additive copy). null when off. */
export function bloomLayerStyle(
  input: BloomInput,
  active: boolean
): BloomStyle | null {
  if (!active || input === "off") return null
  const cfg = typeof input === "string" ? PRESET[input] : input
  return {
    filter: `blur(${cfg.blur}px) brightness(${cfg.brightness}) saturate(${cfg.saturate ?? 1})`,
    opacity: cfg.opacity,
    mixBlendMode: cfg.blend ?? "plus-lighter",
    imageRendering: "auto",
  }
}

// Easing — gentle start + soft settle so entrances don't feel linear.
export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t)

/** Whether the OS asks for reduced motion (snap + steady stars). */
export function prefersReducedMotion() {
  return (
    window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false
  )
}
