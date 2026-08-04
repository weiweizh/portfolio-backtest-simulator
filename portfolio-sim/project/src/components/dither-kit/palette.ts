// Shared seed palette for the dither chart family. Mirrors the seeds in
// `dither-chart.tsx` so a series rendered through the composable engine reads
// with the exact same fill / line / star hues as the legacy sparkline.

export type Rgb = [number, number, number]

export type DitherColor =
  | "green"
  | "blue"
  | "purple"
  | "pink"
  | "orange"
  | "red"
  | "grey"
  | "teal"
  | "ink"

export type Seed = { fill: Rgb; line: Rgb; star: Rgb }

// Each seed: the area-fill hue, the bright series line, and the star sparkle.
export const PALETTE: Record<DitherColor, Seed> = {
  green: { fill: [40, 210, 110], line: [150, 255, 180], star: [200, 255, 220] },
  blue: { fill: [74, 121, 232], line: [28, 62, 155], star: [55, 95, 200] },
  purple: {
    fill: [150, 110, 255],
    line: [200, 175, 255],
    star: [225, 210, 255],
  },
  pink: { fill: [248, 104, 196], line: [175, 25, 120], star: [220, 70, 160] },
  orange: { fill: [194, 96, 10], line: [122, 58, 6], star: [165, 82, 10] },
  red: { fill: [240, 70, 70], line: [255, 150, 140], star: [255, 195, 185] },
  // No-data: a muted grey so empty metrics read as "nothing here".
  grey: { fill: [64, 64, 72], line: [20, 20, 26], star: [105, 105, 115] },
  teal: { fill: [13, 148, 136], line: [7, 70, 64], star: [10, 112, 102] },
  ink: { fill: [35, 35, 40], line: [10, 10, 14], star: [70, 70, 78] },
}

export const rgb = ([r, g, b]: Rgb, k = 1, a = 1) =>
  `rgba(${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)},${a})`

export const seedOfColor = (color: DitherColor): Seed => PALETTE[color]

export const isDitherColor = (value: unknown): value is DitherColor =>
  typeof value === "string" && value in PALETTE
