import test from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { composeRow, decodeRgba, frameToCell, opaqueBBox, processTurnaround, sliceGrid } from "./sheet";
import { encodeGif } from "./gif";
import { mockTurnaround } from "./mock";

async function solidPng(
  width: number,
  height: number,
  color: { r: number; g: number; b: number; alpha: number },
): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 4, background: color },
  })
    .png()
    .toBuffer();
}

test("sliceGrid splits a 2x2 sheet in row-major order", async () => {
  const red = await solidPng(8, 8, { r: 255, g: 0, b: 0, alpha: 255 });
  const green = await solidPng(8, 8, { r: 0, g: 255, b: 0, alpha: 255 });
  const blue = await solidPng(8, 8, { r: 0, g: 0, b: 255, alpha: 255 });
  const white = await solidPng(8, 8, { r: 255, g: 255, b: 255, alpha: 255 });
  const sheet = await sharp({
    create: { width: 16, height: 16, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 255 } },
  })
    .composite([
      { input: red, left: 0, top: 0 },
      { input: green, left: 8, top: 0 },
      { input: blue, left: 0, top: 8 },
      { input: white, left: 8, top: 8 },
    ])
    .png()
    .toBuffer();

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
  const blob = await solidPng(20, 20, { r: 220, g: 40, b: 40, alpha: 255 });
  const canvas = await sharp({
    create: {
      width: 80,
      height: 80,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 255 },
    },
  })
    .composite([{ input: blob, left: 8, top: 10 }])
    .png()
    .toBuffer();

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
  const a = await frameToCell(await solidPng(16, 16, { r: 10, g: 200, b: 80, alpha: 255 }), 16, true);
  const b = await frameToCell(await solidPng(16, 16, { r: 10, g: 80, b: 200, alpha: 255 }), 16, true);
  const row = await composeRow([a, b, a, b], 16);
  const meta = await sharp(row).metadata();
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
  const meta = await sharp(result.sheet).metadata();
  assert.equal(meta.width, 128);
  assert.equal(meta.height, 32);
});

test("encodeGif writes a GIF header", async () => {
  const frame = await frameToCell(
    await solidPng(32, 32, { r: 40, g: 180, b: 90, alpha: 255 }),
    16,
    true,
  );
  const gif = await encodeGif([frame, frame, frame], 8, "looping");
  assert.equal(gif.subarray(0, 6).toString("ascii"), "GIF89a");
  assert.ok(gif.length > 32);
});
