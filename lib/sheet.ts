import { gridForFrameCount } from "./grid";
import {
  composite,
  createTransparent,
  decodePng,
  encodePng,
  extract,
  fillRect,
  resizeNearest,
  type RgbaBitmap,
} from "./png";
import type { Direction, SpriteSize } from "./types";
import { DIRECTIONS } from "./types";

export type { RgbaBitmap };
export type BBox = { minX: number; minY: number; maxX: number; maxY: number };

export async function decodeRgba(input: Buffer): Promise<RgbaBitmap> {
  return decodePng(input);
}

export async function encodePngBuffer(bitmap: RgbaBitmap): Promise<Buffer> {
  return encodePng(bitmap);
}

export async function emptyCell(spriteSize: number): Promise<Buffer> {
  return encodePng(createTransparent(spriteSize, spriteSize));
}

function colorDist(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
): number {
  return Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b);
}

function samplePatch(
  data: Buffer,
  width: number,
  height: number,
  originX: number,
  originY: number,
): { r: number; g: number; b: number } {
  const size = Math.min(6, width, height);
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let y = originY; y < originY + size && y < height; y++) {
    for (let x = originX; x < originX + size && x < width; x++) {
      const i = (y * width + x) * 4;
      r += data[i];
      g += data[i + 1];
      b += data[i + 2];
      n += 1;
    }
  }
  return { r: r / n, g: g / n, b: b / n };
}

export function knockOutBackground(bitmap: RgbaBitmap, threshold = 54): void {
  const { data, width, height } = bitmap;
  const samples = [
    samplePatch(data, width, height, 0, 0),
    samplePatch(data, width, height, Math.max(0, width - 6), 0),
    samplePatch(data, width, height, 0, Math.max(0, height - 6)),
    samplePatch(data, width, height, Math.max(0, width - 6), Math.max(0, height - 6)),
  ];
  const bg = {
    r: samples.reduce((s, c) => s + c.r, 0) / 4,
    g: samples.reduce((s, c) => s + c.g, 0) / 4,
    b: samples.reduce((s, c) => s + c.b, 0) / 4,
  };
  const similarCorners = samples.filter((sample) => colorDist(sample, bg) < 40).length;
  if (similarCorners < 3) {
    return;
  }

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const seeds = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];
  for (const [x, y] of seeds) {
    stack.push(y * width + x);
  }

  while (stack.length > 0) {
    const p = stack.pop()!;
    if (p < 0 || p >= width * height || visited[p]) continue;
    visited[p] = 1;
    const i = p * 4;
    const dist = colorDist({ r: data[i], g: data[i + 1], b: data[i + 2] }, bg);
    if (dist > threshold) continue;
    data[i + 3] = 0;
    const x = p % width;
    const y = Math.floor(p / width);
    if (x + 1 < width) stack.push(p + 1);
    if (x > 0) stack.push(p - 1);
    if (y + 1 < height) stack.push(p + width);
    if (y > 0) stack.push(p - width);
  }
}

export function opaqueBBox(bitmap: RgbaBitmap, alphaMin = 8): BBox | null {
  const { data, width, height } = bitmap;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] > alphaMin) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) return null;
  return { minX, minY, maxX, maxY };
}

export async function sliceGrid(image: Buffer, cols: number, rows: number): Promise<Buffer[]> {
  const bitmap = decodePng(image);
  const cellW = Math.floor(bitmap.width / cols);
  const cellH = Math.floor(bitmap.height / rows);
  if (cellW < 1 || cellH < 1) {
    throw new Error("그리드 칸이 너무 작습니다.");
  }
  const cells: Buffer[] = [];
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      cells.push(encodePng(extract(bitmap, col * cellW, row * cellH, cellW, cellH)));
    }
  }
  return cells;
}

export async function frameToCell(
  input: Buffer,
  spriteSize: number,
  inplace: boolean,
): Promise<Buffer> {
  const bitmap = decodePng(input);
  knockOutBackground(bitmap);
  const bbox = opaqueBBox(bitmap);
  if (!bbox) {
    return emptyCell(spriteSize);
  }

  const boxW = bbox.maxX - bbox.minX + 1;
  const boxH = bbox.maxY - bbox.minY + 1;
  const pad = spriteSize <= 16 ? 1 : 2;
  const maxW = Math.max(1, spriteSize - pad * 2);
  const maxH = Math.max(1, spriteSize - pad * 2);
  const scale = Math.min(maxW / boxW, maxH / boxH);
  const destW = Math.max(1, Math.round(boxW * scale));
  const destH = Math.max(1, Math.round(boxH * scale));
  const cropped = resizeNearest(extract(bitmap, bbox.minX, bbox.minY, boxW, boxH), destW, destH);

  let left: number;
  let top: number;
  if (inplace) {
    left = Math.round(spriteSize / 2 - destW / 2);
    top = Math.round(spriteSize - pad - destH);
  } else {
    left = Math.round((spriteSize - destW) / 2);
    top = Math.round((spriteSize - destH) / 2);
  }
  left = Math.min(Math.max(left, 0), spriteSize - destW);
  top = Math.min(Math.max(top, 0), spriteSize - destH);

  const cell = createTransparent(spriteSize, spriteSize);
  composite(cell, cropped, left, top);
  return encodePng(cell);
}

export async function composeRow(frames: Buffer[], spriteSize: number): Promise<Buffer> {
  if (frames.length === 0) {
    return emptyCell(spriteSize);
  }
  const row = createTransparent(spriteSize * frames.length, spriteSize);
  frames.forEach((frame, index) => {
    composite(row, decodePng(frame), index * spriteSize, 0);
  });
  return encodePng(row);
}

export async function processTurnaround(
  image: Buffer,
  spriteSize: SpriteSize,
): Promise<{ directions: Record<Direction, Buffer>; sheet: Buffer }> {
  const cells = await sliceGrid(image, 2, 2);
  const directions = {} as Record<Direction, Buffer>;
  for (let i = 0; i < DIRECTIONS.length; i++) {
    directions[DIRECTIONS[i]] = await frameToCell(cells[i], spriteSize, true);
  }
  const sheet = await composeRow(
    DIRECTIONS.map((dir) => directions[dir]),
    spriteSize,
  );
  return { directions, sheet };
}

export async function processMotionSheet(
  image: Buffer,
  spriteSize: SpriteSize,
  frameCount: number,
  inplace: boolean,
): Promise<{ frames: Buffer[]; sheet: Buffer }> {
  const grid = gridForFrameCount(frameCount);
  const cells = await sliceGrid(image, grid.cols, grid.rows);
  const used = cells.slice(0, frameCount);
  const frames = [];
  for (const cell of used) {
    frames.push(await frameToCell(cell, spriteSize, inplace));
  }
  const sheet = await composeRow(frames, spriteSize);
  return { frames, sheet };
}

export function solidBitmap(
  width: number,
  height: number,
  color: { r: number; g: number; b: number; alpha: number },
): Buffer {
  const bitmap = createTransparent(width, height);
  fillRect(bitmap, 0, 0, width, height, color);
  return encodePng(bitmap);
}
