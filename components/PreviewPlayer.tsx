"use client";

import { useEffect, useRef, useState } from "react";
import { cycleSeconds, frameDurationMs } from "@/lib/timing";
import type { LoopMode } from "@/lib/types";

type PreviewPlayerProps = {
  frames: string[];
  fps: number;
  loop: LoopMode;
  spriteSize: number;
};

export function PreviewPlayer({ frames, fps, loop, spriteSize }: PreviewPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imagesRef = useRef<HTMLImageElement[]>([]);
  const playingRef = useRef(true);
  const indexRef = useRef(0);
  const fpsRef = useRef(fps);
  const loopRef = useRef(loop);
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const scale = spriteSize <= 16 ? 10 : spriteSize <= 32 ? 6 : 4;

  useEffect(() => {
    fpsRef.current = fps;
    loopRef.current = loop;
  }, [fps, loop]);

  const motionCount = loop === "oneshot" ? Math.max(frames.length - 1, 1) : frames.length;
  const durationMs = frameDurationMs(fps);
  const cycle = cycleSeconds(motionCount, fps);

  const draw = (frameIndex: number) => {
    const canvas = canvasRef.current;
    const image = imagesRef.current[frameIndex];
    if (!canvas || !image) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.imageSmoothingEnabled = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, spriteSize, spriteSize, 0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    let cancelled = false;
    imagesRef.current = [];
    Promise.all(
      frames.map(
        (src) =>
          new Promise<HTMLImageElement>((resolve, reject) => {
            const image = new Image();
            image.onload = () => resolve(image);
            image.onerror = () => reject(new Error("미리보기 프레임을 읽지 못했습니다."));
            image.src = src;
          }),
      ),
    ).then((images) => {
      if (cancelled) return;
      imagesRef.current = images;
      draw(indexRef.current);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, spriteSize]);

  useEffect(() => {
    if (frames.length === 0) return;
    let raf = 0;
    let last = performance.now();
    let leftover = 0;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      const currentFps = Math.max(1, fpsRef.current);
      const currentLoop = loopRef.current;
      const holdCount =
        currentLoop === "oneshot" ? Math.max(frames.length - 1, 1) : frames.length;
      if (playingRef.current) {
        leftover += delta;
        const duration = 1000 / currentFps;
        while (leftover >= duration) {
          leftover -= duration;
          let nextIndex = indexRef.current + 1;
          if (currentLoop === "looping") {
            nextIndex %= frames.length;
          } else if (nextIndex >= holdCount) {
            nextIndex = frames.length - 1;
            playingRef.current = false;
            leftover = 0;
            setPlaying(false);
          }
          if (nextIndex !== indexRef.current) {
            indexRef.current = nextIndex;
            setIndex(nextIndex);
            draw(nextIndex);
          }
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, spriteSize]);

  if (frames.length === 0) {
    return <p className="muted">아직 재생할 프레임이 없습니다.</p>;
  }

  return (
    <div className="preview-wrap">
      <div className="preview-stage">
        <canvas
          ref={canvasRef}
          width={spriteSize * scale}
          height={spriteSize * scale}
          className="pixel-canvas"
        />
      </div>
      <p className="timing-line">
        초당 {fps}장 · 한 장 {Math.round(durationMs)}ms
        {loop === "looping" ? ` · 한 바퀴 ${cycle.toFixed(2)}초` : " · 원샷 후 idle"}
      </p>
      <div className="preview-controls">
        <button
          type="button"
          className="ghost"
          onClick={() => {
            const next = !playingRef.current;
            playingRef.current = next;
            setPlaying(next);
          }}
        >
          {playing ? "정지" : "재생"}
        </button>
        <input
          type="range"
          min={0}
          max={frames.length - 1}
          value={index}
          onChange={(event) => {
            const value = Number(event.target.value);
            playingRef.current = false;
            setPlaying(false);
            indexRef.current = value;
            setIndex(value);
            draw(value);
          }}
        />
        <span className="mono">
          {index + 1}/{frames.length}
        </span>
      </div>
    </div>
  );
}
