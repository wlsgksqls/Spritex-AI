"use client";

import { useEffect, useRef, useState } from "react";
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
  const [playing, setPlaying] = useState(true);
  const [index, setIndex] = useState(0);
  const scale = spriteSize <= 16 ? 10 : spriteSize <= 32 ? 6 : 4;

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
    let elapsed = 0;
    indexRef.current = 0;
    playingRef.current = true;
    const motionCount = loop === "oneshot" ? Math.max(frames.length - 1, 1) : frames.length;

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      if (playingRef.current) {
        elapsed += delta;
        const next = Math.floor((elapsed / 1000) * fps);
        let nextIndex = indexRef.current;
        if (loop === "looping") {
          nextIndex = next % frames.length;
        } else if (next >= motionCount) {
          nextIndex = frames.length - 1;
          playingRef.current = false;
          setPlaying(false);
        } else {
          nextIndex = next;
        }
        if (nextIndex !== indexRef.current) {
          indexRef.current = nextIndex;
          setIndex(nextIndex);
          draw(nextIndex);
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frames, fps, loop, spriteSize]);

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
          {index + 1}/{frames.length} · {fps} FPS
        </span>
      </div>
    </div>
  );
}
