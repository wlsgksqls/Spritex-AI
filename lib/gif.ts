import { GIFEncoder, applyPalette, quantize } from "gifenc";
import sharp from "sharp";
import type { LoopMode } from "./types";

export async function encodeGif(
  frames: Buffer[],
  fps: number,
  loop: LoopMode,
): Promise<Buffer> {
  if (frames.length === 0) {
    throw new Error("GIF로 만들 프레임이 없습니다.");
  }

  const decoded = await Promise.all(
    frames.map(async (frame) => {
      const { data, info } = await sharp(frame)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return {
        data: new Uint8Array(data),
        width: info.width,
        height: info.height,
      };
    }),
  );

  const width = decoded[0].width;
  const height = decoded[0].height;
  const merged = new Uint8Array(decoded.reduce((sum, frame) => sum + frame.data.length, 0));
  let offset = 0;
  for (const frame of decoded) {
    merged.set(frame.data, offset);
    offset += frame.data.length;
  }

  const palette = quantize(merged, 255, { format: "rgb565" });
  palette.unshift([0, 0, 0]);

  const delay = Math.max(20, Math.round(100 / fps) * 10);
  const gif = GIFEncoder();
  const repeat = loop === "looping" ? 0 : -1;

  decoded.forEach((frame, index) => {
    const indexed = applyPalette(frame.data, palette, "rgb565");
    for (let pixel = 0; pixel < indexed.length; pixel++) {
      if (frame.data[pixel * 4 + 3] < 16) {
        indexed[pixel] = 0;
      } else if (indexed[pixel] === 0) {
        indexed[pixel] = 1;
      }
    }
    gif.writeFrame(indexed, width, height, {
      palette: index === 0 ? palette : undefined,
      delay,
      repeat: index === 0 ? repeat : undefined,
      transparent: true,
      transparentIndex: 0,
    });
  });

  gif.finish();
  return Buffer.from(gif.bytes());
}
