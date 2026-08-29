import { PNG } from "pngjs";

export type RgbaBitmap = {
  data: Buffer;
  width: number;
  height: number;
};

export function decodePng(input: Buffer): RgbaBitmap {
  const png = PNG.sync.read(input);
  return {
    data: Buffer.from(png.data),
    width: png.width,
    height: png.height,
  };
}

export function encodePng(bitmap: RgbaBitmap): Buffer {
  const png = new PNG({ width: bitmap.width, height: bitmap.height });
  bitmap.data.copy(png.data);
  return PNG.sync.write(png);
}

export function createTransparent(width: number, height: number): RgbaBitmap {
  return { data: Buffer.alloc(width * height * 4), width, height };
}

export function fillRect(
  bitmap: RgbaBitmap,
  left: number,
  top: number,
  width: number,
  height: number,
  color: { r: number; g: number; b: number; alpha: number },
): void {
  for (let y = top; y < top + height; y++) {
    if (y < 0 || y >= bitmap.height) continue;
    for (let x = left; x < left + width; x++) {
      if (x < 0 || x >= bitmap.width) continue;
      const i = (y * bitmap.width + x) * 4;
      bitmap.data[i] = color.r;
      bitmap.data[i + 1] = color.g;
      bitmap.data[i + 2] = color.b;
      bitmap.data[i + 3] = color.alpha;
    }
  }
}

export function extract(
  src: RgbaBitmap,
  left: number,
  top: number,
  width: number,
  height: number,
): RgbaBitmap {
  const out = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const srcY = top + y;
    if (srcY < 0 || srcY >= src.height) continue;
    const srcStart = (srcY * src.width + left) * 4;
    src.data.copy(out, y * width * 4, srcStart, srcStart + width * 4);
  }
  return { data: out, width, height };
}

export function resizeNearest(src: RgbaBitmap, destW: number, destH: number): RgbaBitmap {
  const out = Buffer.alloc(destW * destH * 4);
  for (let y = 0; y < destH; y++) {
    const srcY = Math.min(src.height - 1, Math.floor(((y + 0.5) * src.height) / destH));
    for (let x = 0; x < destW; x++) {
      const srcX = Math.min(src.width - 1, Math.floor(((x + 0.5) * src.width) / destW));
      const si = (srcY * src.width + srcX) * 4;
      const di = (y * destW + x) * 4;
      out[di] = src.data[si];
      out[di + 1] = src.data[si + 1];
      out[di + 2] = src.data[si + 2];
      out[di + 3] = src.data[si + 3];
    }
  }
  return { data: out, width: destW, height: destH };
}

export function composite(dest: RgbaBitmap, src: RgbaBitmap, left: number, top: number): void {
  for (let y = 0; y < src.height; y++) {
    const dy = top + y;
    if (dy < 0 || dy >= dest.height) continue;
    for (let x = 0; x < src.width; x++) {
      const dx = left + x;
      if (dx < 0 || dx >= dest.width) continue;
      const si = (y * src.width + x) * 4;
      const di = (dy * dest.width + dx) * 4;
      dest.data[di] = src.data[si];
      dest.data[di + 1] = src.data[si + 1];
      dest.data[di + 2] = src.data[si + 2];
      dest.data[di + 3] = src.data[si + 3];
    }
  }
}
