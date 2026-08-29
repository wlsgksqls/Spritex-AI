import type { ReactNode } from "react";
import type { LoopMode, SpriteSize, StudioOptions, ViewType } from "@/lib/types";
import { SPRITE_SIZES } from "@/lib/types";

type OptionPanelProps = {
  options: StudioOptions;
  onChange: (patch: Partial<StudioOptions>) => void;
  disabled?: boolean;
  children?: ReactNode;
};

function Segment<T extends string | number>({
  value,
  options,
  onChange,
  disabled,
}: {
  value: T;
  options: Array<{ value: T; label: string }>;
  onChange: (value: T) => void;
  disabled?: boolean;
}) {
  return (
    <div className="seg">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          className={value === option.value ? "seg-on" : ""}
          disabled={disabled}
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function OptionPanel({ options, onChange, disabled, children }: OptionPanelProps) {
  return (
    <div className="stack">
      <label className="field">
        <span>스프라이트 크기</span>
        <Segment<SpriteSize>
          value={options.spriteSize}
          disabled={disabled}
          onChange={(spriteSize) => onChange({ spriteSize })}
          options={SPRITE_SIZES.map((size) => ({ value: size, label: `${size}×${size}` }))}
        />
      </label>
      <label className="field">
        <span>시점</span>
        <Segment<ViewType>
          value={options.view}
          disabled={disabled}
          onChange={(view) => onChange({ view })}
          options={[
            { value: "side", label: "사이드" },
            { value: "top", label: "탑" },
            { value: "quarter", label: "쿼터" },
          ]}
        />
      </label>
      {children}
    </div>
  );
}

export function MotionOptions({
  options,
  onChange,
  disabled,
}: {
  options: StudioOptions;
  onChange: (patch: Partial<StudioOptions>) => void;
  disabled?: boolean;
}) {
  return (
    <div className="stack">
      <label className="field">
        <span>프레임 수 · {options.frameCount}</span>
        <input
          type="range"
          min={4}
          max={16}
          value={options.frameCount}
          disabled={disabled}
          onChange={(event) => onChange({ frameCount: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        <span>FPS · {options.fps}</span>
        <input
          type="range"
          min={4}
          max={24}
          value={options.fps}
          disabled={disabled}
          onChange={(event) => onChange({ fps: Number(event.target.value) })}
        />
      </label>
      <label className="field">
        <span>Inplace</span>
        <Segment<string>
          value={options.inplace ? "on" : "off"}
          disabled={disabled}
          onChange={(value) => onChange({ inplace: value === "on" })}
          options={[
            { value: "on", label: "제자리 고정" },
            { value: "off", label: "오프셋 허용" },
          ]}
        />
      </label>
      <label className="field">
        <span>루프</span>
        <Segment<LoopMode>
          value={options.loop}
          disabled={disabled}
          onChange={(loop) => onChange({ loop })}
          options={[
            { value: "looping", label: "무한 반복" },
            { value: "oneshot", label: "원샷 → idle" },
          ]}
        />
      </label>
    </div>
  );
}
