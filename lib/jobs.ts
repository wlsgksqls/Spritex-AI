import { bufferToPngDataUrl, parseDataUrl } from "./dataUrl";
import { encodeGif } from "./gif";
import { generateGeminiImage } from "./gemini";
import { aspectRatioForGrid, gridForFrameCount } from "./grid";
import { mockMotionSheet, mockTurnaround } from "./mock";
import { assertSafePrompt } from "./policy";
import { motionSheetPrompt, turnaroundPrompt } from "./prompts";
import { processMotionSheet, processTurnaround } from "./sheet";
import type {
  BaseCharacter,
  Direction,
  ImageInput,
  LoopMode,
  SpriteJobResult,
  SpriteSize,
  ViewType,
} from "./types";
import { DIRECTIONS } from "./types";

function toImageInput(dataUrl: string): ImageInput {
  const parsed = parseDataUrl(dataUrl);
  return { mimeType: parsed.mimeType, base64: parsed.base64 };
}

export async function runCharacterJob(opts: {
  spriteSize: SpriteSize;
  view: ViewType;
  characterPrompt: string;
  referenceDataUrl?: string;
  apiKey: string | null;
}): Promise<BaseCharacter> {
  assertSafePrompt(opts.characterPrompt);
  const usedMock = !opts.apiKey;
  const raw = usedMock
    ? await mockTurnaround(opts)
    : await generateGeminiImage({
        apiKey: opts.apiKey!,
        prompt: turnaroundPrompt({
          characterPrompt: opts.characterPrompt,
          view: opts.view,
          spriteSize: opts.spriteSize,
          hasReference: Boolean(opts.referenceDataUrl),
        }),
        images: opts.referenceDataUrl ? [toImageInput(opts.referenceDataUrl)] : undefined,
        aspectRatio: "1:1",
      });

  const processed = await processTurnaround(raw, opts.spriteSize);
  const directions = {} as Record<Direction, string>;
  for (const dir of DIRECTIONS) {
    directions[dir] = bufferToPngDataUrl(processed.directions[dir]);
  }
  return {
    spriteSize: opts.spriteSize,
    view: opts.view,
    prompt: opts.characterPrompt,
    directions,
    turnaroundSheetDataUrl: bufferToPngDataUrl(processed.sheet),
    usedMock,
  };
}

export async function runSpriteJob(opts: {
  spriteSize: SpriteSize;
  view: ViewType;
  frameCount: number;
  fps: number;
  inplace: boolean;
  loop: LoopMode;
  characterPrompt: string;
  motionPrompt: string;
  directions: Record<Direction, string>;
  apiKey: string | null;
}): Promise<SpriteJobResult> {
  assertSafePrompt(opts.motionPrompt);
  if (opts.frameCount < 4 || opts.frameCount > 16) {
    throw new Error("프레임 수는 4에서 16 사이여야 합니다.");
  }
  if (opts.fps < 4 || opts.fps > 24) {
    throw new Error("FPS는 4에서 24 사이여야 합니다.");
  }

  const usedMock = !opts.apiKey;
  const references = DIRECTIONS.map((dir) => toImageInput(opts.directions[dir]));
  const raw = usedMock
    ? await mockMotionSheet({
        characterPrompt: opts.characterPrompt,
        motionPrompt: opts.motionPrompt,
        view: opts.view,
        frameCount: opts.frameCount,
      })
    : await generateGeminiImage({
        apiKey: opts.apiKey!,
        prompt: motionSheetPrompt(opts),
        images: references,
        aspectRatio: aspectRatioForGrid(gridForFrameCount(opts.frameCount)),
      });

  const processed = await processMotionSheet(
    raw,
    opts.spriteSize,
    opts.frameCount,
    opts.inplace,
  );

  const frameUrls = processed.frames.map(bufferToPngDataUrl);
  const previewBuffers = [...processed.frames];
  if (opts.loop === "oneshot") {
    const idle = Buffer.from(parseDataUrl(opts.directions.front).buffer);
    previewBuffers.push(idle);
  }
  const previewFrames = previewBuffers.map(bufferToPngDataUrl);
  const gif = await encodeGif(previewBuffers, opts.fps, opts.loop);

  return {
    spriteSize: opts.spriteSize,
    frameCount: opts.frameCount,
    fps: opts.fps,
    inplace: opts.inplace,
    loop: opts.loop,
    sheetDataUrl: bufferToPngDataUrl(processed.sheet),
    frames: frameUrls,
    previewFrames,
    gifDataUrl: `data:image/gif;base64,${gif.toString("base64")}`,
    usedMock,
  };
}
