import type { Grid } from "./types";

export function gridForFrameCount(frameCount: number): Grid {
  if (frameCount <= 4) return { cols: 2, rows: 2 };
  if (frameCount <= 8) return { cols: 4, rows: 2 };
  if (frameCount <= 12) return { cols: 4, rows: 3 };
  return { cols: 4, rows: 4 };
}

export function aspectRatioForGrid(grid: Grid): string {
  const ratio = grid.cols / grid.rows;
  if (Math.abs(ratio - 1) < 0.08) return "1:1";
  if (ratio >= 1.7) return "16:9";
  if (ratio >= 1.2) return "4:3";
  if (ratio <= 0.6) return "9:16";
  return "1:1";
}
