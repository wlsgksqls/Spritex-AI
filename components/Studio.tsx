"use client";

import { useEffect, useMemo, useState } from "react";
import { MotionOptions, OptionPanel } from "@/components/OptionPanel";
import { PreviewPlayer } from "@/components/PreviewPlayer";
import { SheetViewer } from "@/components/SheetViewer";
import type { BaseCharacter, SpriteJobResult, StudioOptions } from "@/lib/types";
import { apiUrl } from "@/lib/apiUrl";
import { DEFAULT_OPTIONS, DIRECTIONS } from "@/lib/types";

type Config = { hasServerKey: boolean; model: string };

const KEY_STORAGE = "spritex.geminiApiKey";

function downloadDataUrl(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
}

async function fileToPngDataUrl(file: File): Promise<string> {
  if (file.type === "image/png") {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("이미지를 읽지 못했습니다."));
      reader.readAsDataURL(file);
    });
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("이미지를 열지 못했습니다."));
      el.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("캔버스를 만들 수 없습니다.");
    ctx.drawImage(image, 0, 0);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

async function postJson<T>(url: string, body: unknown, apiKey: string): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["x-gemini-api-key"] = apiKey;
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || "요청에 실패했습니다.");
  }
  return data;
}

export function Studio() {
  const [options, setOptions] = useState<StudioOptions>(DEFAULT_OPTIONS);
  const [apiKey, setApiKey] = useState("");
  const [rememberKey, setRememberKey] = useState(true);
  const [config, setConfig] = useState<Config>({ hasServerKey: false, model: "" });
  const [step, setStep] = useState<1 | 2>(1);
  const [busy, setBusy] = useState<"character" | "sprite" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [base, setBase] = useState<BaseCharacter | null>(null);
  const [sprite, setSprite] = useState<SpriteJobResult | null>(null);
  const [referenceName, setReferenceName] = useState<string | null>(null);
  const [referenceDataUrl, setReferenceDataUrl] = useState<string | undefined>();
  const [gifBusy, setGifBusy] = useState(false);

  useEffect(() => {
    const stored =
      window.localStorage.getItem(KEY_STORAGE) || window.sessionStorage.getItem(KEY_STORAGE) || "";
    fetch(apiUrl("/api/config"))
      .then((res) => res.json())
      .then((data: Config) => {
        setConfig(data);
        if (stored) setApiKey(stored);
      })
      .catch(() => {
        if (stored) setApiKey(stored);
      });
  }, []);

  const persistKey = (value: string, remember: boolean) => {
    window.sessionStorage.setItem(KEY_STORAGE, value);
    if (remember && value) window.localStorage.setItem(KEY_STORAGE, value);
    else window.localStorage.removeItem(KEY_STORAGE);
  };

  const keyStatus = useMemo(() => {
    if (apiKey.trim()) return "브라우저에 입력한 Gemini 키로 생성합니다.";
    if (config.hasServerKey) return "서버 GEMINI_API_KEY로 생성합니다. 원하면 아래에 내 키를 넣을 수 있습니다.";
    return "키가 없습니다. 지금은 데모 스프라이트(목 생성)로 파이프라인을 돌립니다.";
  }, [apiKey, config.hasServerKey]);

  const patch = (next: Partial<StudioOptions>) => {
    setOptions((current) => {
      const merged = { ...current, ...next };
      if (next.spriteSize && next.spriteSize !== current.spriteSize) {
        setBase(null);
        setSprite(null);
        setStep(1);
      }
      if (next.view && next.view !== current.view) {
        setBase(null);
        setSprite(null);
        setStep(1);
      }
      return merged;
    });
  };

  const generateCharacter = async () => {
    setError(null);
    setBusy("character");
    try {
      persistKey(apiKey.trim(), rememberKey);
      const result = await postJson<BaseCharacter>(
        apiUrl("/api/character"),
        {
          spriteSize: options.spriteSize,
          view: options.view,
          characterPrompt: options.characterPrompt,
          referenceDataUrl,
        },
        apiKey.trim(),
      );
      setBase(result);
      setSprite(null);
      setStep(2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setBusy(null);
    }
  };

  const generateSprite = async () => {
    if (!base) return;
    setError(null);
    setBusy("sprite");
    try {
      persistKey(apiKey.trim(), rememberKey);
      const result = await postJson<SpriteJobResult>(
        apiUrl("/api/sprite"),
        {
          spriteSize: options.spriteSize,
          view: options.view,
          frameCount: options.frameCount,
          fps: options.fps,
          inplace: options.inplace,
          loop: options.loop,
          characterPrompt: options.characterPrompt,
          motionPrompt: options.motionPrompt,
          directions: base.directions,
        },
        apiKey.trim(),
      );
      setSprite(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "생성 실패");
    } finally {
      setBusy(null);
    }
  };

  const previewFrames = useMemo(() => {
    if (!sprite) return [];
    if (options.loop === "oneshot" && base) {
      return [...sprite.frames, base.directions.front];
    }
    return sprite.frames;
  }, [sprite, options.loop, base]);

  const downloadGif = async () => {
    if (!sprite || previewFrames.length === 0) return;
    setError(null);
    setGifBusy(true);
    try {
      const result = await postJson<{ gifDataUrl: string }>(
        apiUrl("/api/gif"),
        {
          frames: previewFrames,
          fps: options.fps,
          loop: options.loop,
        },
        apiKey.trim(),
      );
      downloadDataUrl(result.gifDataUrl, "spritex-preview.gif");
    } catch (err) {
      setError(err instanceof Error ? err.message : "GIF 저장 실패");
    } finally {
      setGifBusy(false);
    }
  };

  const demo = Boolean((base?.usedMock || sprite?.usedMock) && !apiKey.trim() && !config.hasServerKey);

  return (
    <div className="studio">
      <header className="topbar">
        <div>
          <p className="kicker">Gemini sprite studio</p>
          <h1>Spritex AI</h1>
        </div>
        <div className="keybox">
          <label>
            <span>Gemini API 키</span>
            <input
              type="password"
              autoComplete="off"
              placeholder={config.hasServerKey ? "비워두면 서버 키 사용" : "AIza… 키를 붙여넣기"}
              value={apiKey}
              onChange={(event) => setApiKey(event.target.value)}
            />
          </label>
          <label className="remember">
            <input
              type="checkbox"
              checked={rememberKey}
              onChange={(event) => setRememberKey(event.target.checked)}
            />
            이 브라우저에 기억
          </label>
          <p className="key-status">{keyStatus}</p>
        </div>
      </header>

      <nav className="steps">
        <button type="button" className={step === 1 ? "step-on" : ""} onClick={() => setStep(1)}>
          1. 기본 모습
        </button>
        <button
          type="button"
          className={step === 2 ? "step-on" : ""}
          onClick={() => base && setStep(2)}
          disabled={!base}
        >
          2. 스프라이트 시트
        </button>
      </nav>

      {error && <div className="banner error">{error}</div>}
      {demo && <div className="banner warn">데모 모드입니다. Gemini 키를 넣으면 같은 버튼으로 실제 생성을 합니다.</div>}

      <div className="layout">
        <aside className="panel">
          {step === 1 ? (
            <>
              <h2>캐릭터 기본 모습</h2>
              <p className="muted">크기와 시점을 먼저 고른 뒤, 360도 4장(앞·오른쪽·뒤·왼쪽)을 만듭니다.</p>
              <OptionPanel options={options} onChange={patch} disabled={busy !== null}>
                <label className="field">
                  <span>캐릭터 프롬프트</span>
                  <textarea
                    rows={5}
                    value={options.characterPrompt}
                    disabled={busy !== null}
                    onChange={(event) => patch({ characterPrompt: event.target.value })}
                    placeholder="누구인지, 옷, 분위기"
                  />
                </label>
                <label className="field">
                  <span>참고 이미지 (선택)</span>
                  <input
                    type="file"
                    accept="image/png,image/webp,image/jpeg"
                    disabled={busy !== null}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (!file) {
                        setReferenceDataUrl(undefined);
                        setReferenceName(null);
                        return;
                      }
                      void fileToPngDataUrl(file)
                        .then((dataUrl) => {
                          setReferenceDataUrl(dataUrl);
                          setReferenceName(file.name);
                        })
                        .catch((err) => {
                          setReferenceDataUrl(undefined);
                          setReferenceName(null);
                          setError(err instanceof Error ? err.message : "이미지를 읽지 못했습니다.");
                        });
                    }}
                  />
                  {referenceName && <small>{referenceName}</small>}
                </label>
              </OptionPanel>
              <button type="button" className="primary" disabled={busy !== null} onClick={generateCharacter}>
                {busy === "character" ? "그리는 중…" : "기본 모습 생성"}
              </button>
            </>
          ) : (
            <>
              <h2>모션 스프라이트 시트</h2>
              <p className="muted">1단계 4장이 참고 캐릭터로 들어갑니다. 옵션은 컨트롤에서, 프롬프트에는 연출만 적습니다.</p>
              <MotionOptions options={options} onChange={patch} disabled={busy !== null} />
              <label className="field">
                <span>모션 프롬프트</span>
                <textarea
                  rows={4}
                  value={options.motionPrompt}
                  disabled={busy !== null}
                  onChange={(event) => patch({ motionPrompt: event.target.value })}
                  placeholder="걷기, 베기, 피격…"
                />
              </label>
              <button type="button" className="primary" disabled={busy !== null || !base} onClick={generateSprite}>
                {busy === "sprite" ? "시트 조립 중…" : "스프라이트 시트 생성"}
              </button>
            </>
          )}
        </aside>

        <main className="stage">
          <SheetViewer
            title="턴어라운드"
            src={base?.turnaroundSheetDataUrl}
            labels={DIRECTIONS.map((dir) => dir)}
          />
          <div className="stage-grid">
            <SheetViewer title="모션 시트" src={sprite?.sheetDataUrl} />
            <section className="sheet-block">
              <h3>미리보기</h3>
              {sprite ? (
                <PreviewPlayer
                  key={`${sprite.sheetDataUrl}-${options.loop}`}
                  frames={previewFrames}
                  fps={options.fps}
                  loop={options.loop}
                  spriteSize={sprite.spriteSize}
                />
              ) : (
                <p className="muted">시트를 만들면 옆에서 모션이 재생됩니다.</p>
              )}
            </section>
          </div>
          <div className="downloads">
            <button
              type="button"
              className="ghost"
              disabled={!sprite}
              onClick={() => sprite && downloadDataUrl(sprite.sheetDataUrl, "spritex-sheet.png")}
            >
              시트 PNG
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!sprite || gifBusy}
              onClick={() => void downloadGif()}
            >
              {gifBusy ? "GIF 만드는 중…" : `GIF (${options.fps} FPS)`}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={!base}
              onClick={() => base && downloadDataUrl(base.turnaroundSheetDataUrl, "spritex-turnaround.png")}
            >
              기본 모습 PNG
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
