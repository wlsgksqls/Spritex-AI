import sharp from "sharp";
import { gridForFrameCount } from "./grid";
import type { Direction, SpriteSize, ViewType } from "./types";

const BG: [number, number, number, number] = [242, 239, 230, 255];

type Canvas = { data: Buffer; width: number; height: number };
type Rgba = [number, number, number, number];

function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function hsl(h: number, s: number, l: number): Rgba {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = light - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return [f(0), f(8), f(4), 255];
}

function makeCanvas(width: number, height: number, fill: Rgba): Canvas {
  const data = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    data[i * 4] = fill[0];
    data[i * 4 + 1] = fill[1];
    data[i * 4 + 2] = fill[2];
    data[i * 4 + 3] = fill[3];
  }
  return { data, width, height };
}

function setPixel(canvas: Canvas, x: number, y: number, color: Rgba): void {
  if (x < 0 || y < 0 || x >= canvas.width || y >= canvas.height) return;
  const i = (y * canvas.width + x) * 4;
  canvas.data[i] = color[0];
  canvas.data[i + 1] = color[1];
  canvas.data[i + 2] = color[2];
  canvas.data[i + 3] = color[3];
}

function fillRect(
  canvas: Canvas,
  x: number,
  y: number,
  w: number,
  h: number,
  color: Rgba,
): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      setPixel(canvas, xx, yy, color);
    }
  }
}

function blit(dest: Canvas, src: Canvas, ox: number, oy: number): void {
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      if (src.data[i + 3] === 0) continue;
      setPixel(dest, ox + x, oy + y, [
        src.data[i],
        src.data[i + 1],
        src.data[i + 2],
        src.data[i + 3],
      ]);
    }
  }
}

function mirror(src: Canvas): Canvas {
  const dest = makeCanvas(src.width, src.height, [0, 0, 0, 0]);
  for (let y = 0; y < src.height; y++) {
    for (let x = 0; x < src.width; x++) {
      const i = (y * src.width + x) * 4;
      setPixel(dest, src.width - 1 - x, y, [
        src.data[i],
        src.data[i + 1],
        src.data[i + 2],
        src.data[i + 3],
      ]);
    }
  }
  return dest;
}

type Palette = {
  skin: Rgba;
  hair: Rgba;
  shirt: Rgba;
  pants: Rgba;
  accent: Rgba;
  outline: Rgba;
};

function paletteFromPrompt(prompt: string): Palette {
  const hash = hashString(prompt || "spritex");
  const hue = hash % 360;
  return {
    skin: hsl(28, 55, 72),
    hair: hsl((hue + 40) % 360, 45, 28),
    shirt: hsl(hue, 70, 48),
    pants: hsl((hue + 210) % 360, 40, 32),
    accent: hsl((hue + 330) % 360, 80, 46),
    outline: [32, 24, 36, 255],
  };
}

function drawCharacter(
  dir: Direction,
  phase: number,
  palette: Palette,
  motion: "idle" | "walk" | "attack",
): Canvas {
  const c = makeCanvas(32, 32, [0, 0, 0, 0]);
  const walk = motion === "walk" ? Math.sin((phase / 8) * Math.PI * 2) : 0;
  const attackRaise = motion === "attack" ? Math.min(phase, 4) : 0;
  const leg = Math.round(walk * 2);

  const outline = (x: number, y: number, w: number, h: number, fill: Rgba) => {
    fillRect(c, x - 1, y, w + 2, h, palette.outline);
    fillRect(c, x, y - 1, w, h + 2, palette.outline);
    fillRect(c, x, y, w, h, fill);
  };

  if (dir === "front" || dir === "back") {
    outline(12, 4, 8, 7, palette.hair);
    fillRect(c, 13, 6, 6, 5, palette.skin);
    if (dir === "front") {
      fillRect(c, 14, 8, 2, 2, palette.outline);
      fillRect(c, 18, 8, 2, 2, palette.outline);
    } else {
      fillRect(c, 12, 3, 8, 3, palette.hair);
    }
    outline(11, 12, 10, 9, palette.shirt);
    fillRect(c, 11, 12, 10, 2, palette.accent);
    outline(10, 13 - Math.floor(attackRaise / 2), 3, 7, palette.skin);
    outline(19, 13 - Math.floor(attackRaise / 2), 3, 7, palette.skin);
    outline(12, 21 + (leg > 0 ? 1 : 0), 3, 7, palette.pants);
    outline(17, 21 + (leg < 0 ? 1 : 0), 3, 7, palette.pants);
    fillRect(c, 12, 27 + (leg > 0 ? 1 : 0), 3, 2, palette.outline);
    fillRect(c, 17, 27 + (leg < 0 ? 1 : 0), 3, 2, palette.outline);
  } else {
    const body = makeCanvas(32, 32, [0, 0, 0, 0]);
    const o = (x: number, y: number, w: number, h: number, fill: Rgba) => {
      fillRect(body, x - 1, y, w + 2, h, palette.outline);
      fillRect(body, x, y - 1, w, h + 2, palette.outline);
      fillRect(body, x, y, w, h, fill);
    };
    o(13, 4, 8, 7, palette.hair);
    fillRect(body, 14, 6, 6, 5, palette.skin);
    fillRect(body, 18, 8, 2, 2, palette.outline);
    o(12, 12, 9, 9, palette.shirt);
    fillRect(body, 12, 12, 9, 2, palette.accent);
    o(18, 13 - Math.floor(attackRaise / 2), 4, 6, palette.skin);
    o(13, 21 + (leg > 0 ? 1 : 0), 3, 7, palette.pants);
    o(17, 21 + (leg < 0 ? 1 : 0), 3, 7, palette.pants);
    return dir === "left" ? mirror(body) : body;
  }
  return c;
}

async function canvasToPng(canvas: Canvas, scale: number): Promise<Buffer> {
  return sharp(canvas.data, {
    raw: { width: canvas.width, height: canvas.height, channels: 4 },
  })
    .resize(canvas.width * scale, canvas.height * scale, { kernel: sharp.kernel.nearest })
    .png()
    .toBuffer();
}

function inferMotion(prompt: string): "walk" | "attack" | "idle" {
  if (/walk|run|걷|달|cycle/i.test(prompt)) return "walk";
  if (/attack|slash|punch|hit|공격|베|치/i.test(prompt)) return "attack";
  if (/idle|대기|숨/i.test(prompt)) return "idle";
  return "walk";
}

export async function mockTurnaround(opts: {
  characterPrompt: string;
  view: ViewType;
  spriteSize: SpriteSize;
}): Promise<Buffer> {
  const palette = paletteFromPrompt(opts.characterPrompt + opts.view);
  const sheet = makeCanvas(64, 64, BG);
  const dirs: Direction[] = ["front", "right", "back", "left"];
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const sprite = drawCharacter(dirs[i], 0, palette, "idle");
    blit(sheet, sprite, col * 32, row * 32);
  }
  return canvasToPng(sheet, 8);
}

export async function mockMotionSheet(opts: {
  characterPrompt: string;
  motionPrompt: string;
  view: ViewType;
  frameCount: number;
}): Promise<Buffer> {
  const palette = paletteFromPrompt(opts.characterPrompt + opts.view);
  const motion = inferMotion(opts.motionPrompt);
  const grid = gridForFrameCount(opts.frameCount);
  const sheet = makeCanvas(grid.cols * 32, grid.rows * 32, BG);
  const facing: Direction = opts.view === "side" ? "right" : "front";
  for (let i = 0; i < grid.cols * grid.rows; i++) {
    const col = i % grid.cols;
    const row = Math.floor(i / grid.cols);
    if (i >= opts.frameCount) continue;
    const sprite = drawCharacter(facing, i, palette, motion);
    blit(sheet, sprite, col * 32, row * 32);
  }
  return canvasToPng(sheet, 8);
}
