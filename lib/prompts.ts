import { gridForFrameCount } from "./grid";
import type { LoopMode, SpriteSize, ViewType } from "./types";

const PIXEL_STYLE = `detailed 32-bit pixel art style (SNES / 16-bit-era game sprite), crisp pixels,
readable silhouette, limited palette, no photorealism, no 3D render, no anime screenshot`;

function sizeHint(spriteSize: SpriteSize): string {
  if (spriteSize === 16) {
    return "very low resolution tiny chibi sprite, chunky pixels, 16x16 game sprite language";
  }
  if (spriteSize === 64) {
    return "readable 64x64 game sprite, a bit more detail in face and equipment, still pixel art";
  }
  return "standard 32x32 game sprite proportions";
}

export function viewSentence(view: ViewType): string {
  switch (view) {
    case "side":
      return "classic 2D side-scroller, camera at character height, side profile for left/right, clear front and back views";
    case "top":
      return "top-down game sprite, camera above, slight 3/4 so the character is readable, facing south in the front cell";
    case "quarter":
      return "quarter-view RPG sprite, 3/4 overhead like SNES-era top-down RPG";
  }
}

export function turnaroundPrompt(opts: {
  characterPrompt: string;
  view: ViewType;
  spriteSize: SpriteSize;
  hasReference: boolean;
}): string {
  const action = opts.hasReference
    ? "Edit the reference character into"
    : "Create";
  return `${action} a 2x2 pixel-art sprite turnaround sheet of a single game character.
Equal-sized cells, no gaps, no labels, no numbers, no watermark, no UI.
Plain solid white background in every cell.

Top-left cell: FRONT view, idle standing.
Top-right cell: RIGHT side view, idle standing.
Bottom-left cell: BACK view, idle standing.
Bottom-right cell: LEFT side view, idle standing.

Same outfit, colors, proportions and silhouette in every cell. Only the facing direction changes.
Full body from head to feet, not a portrait crop. One character only, no scenery.

${PIXEL_STYLE}
${sizeHint(opts.spriteSize)}
Viewpoint: ${viewSentence(opts.view)}
Character: ${opts.characterPrompt}`;
}

export function motionSheetPrompt(opts: {
  motionPrompt: string;
  view: ViewType;
  spriteSize: SpriteSize;
  frameCount: number;
  inplace: boolean;
  loop: LoopMode;
}): string {
  const grid = gridForFrameCount(opts.frameCount);
  const inplaceSentence = opts.inplace
    ? "The character stays in the SAME position in every cell (inplace). Only limbs and body pose change. No translation, no slide across the cell."
    : "The character MAY move within each cell (offset allowed) if the motion needs it, such as a dash or jump arc. Keep the full body visible.";
  const loopSentence =
    opts.loop === "looping"
      ? "This is a looping cycle: first and last frames should connect smoothly."
      : "This is a one-shot motion: anticipation, action, recovery. It should be able to return to a standing idle afterwards. Do not make it a walk cycle unless asked.";

  return `Create a ${grid.cols}x${grid.rows} pixel-art sprite sheet of THIS SAME character from the reference images.
${opts.frameCount} animation frames total, equal cells, left-to-right then top-to-bottom reading order.
If the grid has extra cells, fill only the first ${opts.frameCount} cells and leave extras empty white.
Plain solid white background, no labels, no numbers, no watermark.
Full body, one character, no scenery.

Motion: ${opts.motionPrompt}

${PIXEL_STYLE}
${sizeHint(opts.spriteSize)}
Viewpoint: ${viewSentence(opts.view)}
${inplaceSentence}
${loopSentence}
Keep identity identical to the reference images: same colors, outfit, proportions.`;
}
