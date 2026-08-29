/** GIF only stores delay in 10ms steps. */
export function gifDelayMs(fps: number): number {
  const safeFps = Math.max(1, fps);
  return Math.max(20, Math.round(100 / safeFps) * 10);
}

export function frameDurationMs(fps: number): number {
  return 1000 / Math.max(1, fps);
}

export function cycleSeconds(frameCount: number, fps: number): number {
  return frameCount / Math.max(1, fps);
}
