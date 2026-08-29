export type SpriteSize = 16 | 32 | 64;
export type ViewType = "side" | "top" | "quarter";
export type LoopMode = "looping" | "oneshot";
export type Direction = "front" | "right" | "back" | "left";

export const DIRECTIONS: Direction[] = ["front", "right", "back", "left"];
export const SPRITE_SIZES: SpriteSize[] = [16, 32, 64];

export type StudioOptions = {
  spriteSize: SpriteSize;
  view: ViewType;
  frameCount: number;
  fps: number;
  inplace: boolean;
  loop: LoopMode;
  characterPrompt: string;
  motionPrompt: string;
};

export type BaseCharacter = {
  spriteSize: SpriteSize;
  view: ViewType;
  prompt: string;
  directions: Record<Direction, string>;
  turnaroundSheetDataUrl: string;
  usedMock: boolean;
};

export type SpriteJobResult = {
  spriteSize: SpriteSize;
  frameCount: number;
  fps: number;
  inplace: boolean;
  loop: LoopMode;
  sheetDataUrl: string;
  frames: string[];
  previewFrames: string[];
  gifDataUrl: string;
  usedMock: boolean;
};

export type Grid = { cols: number; rows: number };
export type ImageInput = { mimeType: string; base64: string };

export const DEFAULT_OPTIONS: StudioOptions = {
  spriteSize: 32,
  view: "side",
  frameCount: 8,
  fps: 8,
  inplace: true,
  loop: "looping",
  characterPrompt: "빨간 망토를 입은 작은 기사, 투구와 짧은 검",
  motionPrompt: "오른쪽으로 걷는 걷기 사이클",
};
