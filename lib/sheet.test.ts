import test from "node:test";
import assert from "node:assert/strict";
import { PNG } from "pngjs";
import { encodeGif } from "./gif";
import { mockTurnaround } from "./mock";
import { composite, createTransparent, decodePng, encodePng, fillRect } from "./png";
import {
  composeRow,
  decodeRgba,
  frameToCell,
  opaqueBBox,
  processTurnaround,
  sliceGrid,
  solidBitmap,
} from "./sheet";

function solidPng(width: number, height: number, color: { r: number; g: number; b: number; alpha: number }) {
  return solidBitmap(width, height, color);
}

function pngSize(buffer: Buffer) {
  const png = PNG.sync.read(buffer);
  return { width: png.width, height: png.height };
}

function placeOnCanvas(
  width: number,
  height: number,
  background: { r: number; g: number; b: number; alpha: number },
  parts: Array<{ input: Buffer; left: number; top: number }>,
): Buffer {
  const canvas = createTransparent(width, height);
  fillRect(canvas, 0, 0, width, height, background);
  for (const part of parts) {
    composite(canvas, decodePng(part.input), part.left, part.top);
  }
  return encodePng(canvas);
}

test("sliceGrid splits a 2x2 sheet in row-major order", async () => {
  const red = solidPng(8, 8, { r: 255, g: 0, b: 0, alpha: 255 });
  const green = solidPng(8, 8, { r: 0, g: 255, b: 0, alpha: 255 });
  const blue = solidPng(8, 8, { r: 0, g: 0, b: 255, alpha: 255 });
  const white = solidPng(8, 8, { r: 255, g: 255, b: 255, alpha: 255 });
  const sheet = placeOnCanvas(16, 16, { r: 0, g: 0, b: 0, alpha: 255 }, [
    { input: red, left: 0, top: 0 },
    { input: green, left: 8, top: 0 },
    { input: blue, left: 0, top: 8 },
    { input: white, left: 8, top: 8 },
  ]);

  const cells = await sliceGrid(sheet, 2, 2);
  const colors = await Promise.all(
    cells.map(async (cell) => {
      const { data } = await decodeRgba(cell);
      return [data[0], data[1], data[2]];
    }),
  );
  assert.deepEqual(colors[0], [255, 0, 0]);
  assert.deepEqual(colors[1], [0, 255, 0]);
  assert.deepEqual(colors[2], [0, 0, 255]);
  assert.deepEqual(colors[3], [255, 255, 255]);
});

test("frameToCell inplace plants feet at the bottom center", async () => {
  const blob = solidPng(20, 20, { r: 220, g: 40, b: 40, alpha: 255 });
  const canvas = placeOnCanvas(80, 80, { r: 255, g: 255, b: 255, alpha: 255 }, [
    { input: blob, left: 8, top: 10 },
  ]);

  const cell = await frameToCell(canvas, 32, true);
  const bitmap = await decodeRgba(cell);
  const box = opaqueBBox(bitmap);
  assert.ok(box);
  const feetX = (box!.minX + box!.maxX) / 2;
  assert.ok(Math.abs(feetX - 16) <= 2, `feetX ${feetX}`);
  assert.ok(box!.maxY >= 28 && box!.maxY <= 31, `maxY ${box!.maxY}`);
  assert.equal(bitmap.width, 32);
  assert.equal(bitmap.height, 32);
});

test("composeRow width equals frameCount * spriteSize", async () => {
  const a = await frameToCell(solidPng(16, 16, { r: 10, g: 200, b: 80, alpha: 255 }), 16, true);
  const b = await frameToCell(solidPng(16, 16, { r: 10, g: 80, b: 200, alpha: 255 }), 16, true);
  const row = await composeRow([a, b, a, b], 16);
  const meta = pngSize(row);
  assert.equal(meta.width, 64);
  assert.equal(meta.height, 16);
});

test("mock turnaround becomes a 4-direction 32px sheet", async () => {
  const raw = await mockTurnaround({
    characterPrompt: "test knight",
    view: "side",
    spriteSize: 32,
  });
  const result = await processTurnaround(raw, 32);
  const meta = pngSize(result.sheet);
  assert.equal(meta.width, 128);
  assert.equal(meta.height, 32);
});

test("gifDelayMs is 125ms-class for 8 FPS (10ms GIF steps)", async () => {
  const { gifDelayMs, cycleSeconds, frameDurationMs } = await import("./timing");
  assert.equal(frameDurationMs(8), 125);
  assert.equal(cycleSeconds(8, 8), 1);
  assert.equal(gifDelayMs(8), 130);
  assert.equal(gifDelayMs(10), 100);
});

test("encodeGif writes a GIF header", async () => {
  const frame = await frameToCell(solidPng(32, 32, { r: 40, g: 180, b: 90, alpha: 255 }), 16, true);
  const gif = await encodeGif([frame, frame, frame], 8, "looping");
  assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.ok(gif.length > 32);
});
