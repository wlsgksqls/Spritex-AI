# Spritex AI — 다음 세션 핸드오프 (필독)

이 파일을 먼저 읽어라. 제품 목적, 동작 방식, 확정 스택, 주의점이 여기 있다.
다시 기획을 묻지 말고, 이 스펙 그대로 구현을 이어가라.
사용자(동균, 소프트웨어 엔지니어)는 한국어로 대화한다. UI 카피도 한국어.

최종 갱신: 2026-08-29

---

## 0. 레포가 지금 어디인가

저장소: `https://github.com/wlsgksqls/Spritex-AI` (public, MIT)

프로토타입 앱이 있다. Next.js 스튜디오 + Gemini 이미지 생성 + 시트 후처리.

| 파일 | 역할 |
| --- | --- |
| `README.md` | 서비스 소개 (기획 설명, 사용자용) |
| `LICENSE` | MIT |
| `AGENTS.md` | 이 파일. 구현용 스펙 / 핸드오프 |
| `app/`, `components/`, `lib/` | 프로토타입 소스 |

다음 세션은 스캐폴드를 다시 하지 말고, 이 코드를 읽고 품질·실생성 쪽을 다듬는다.

---

## 1. 이 서비스의 목적

Spritex AI는 **게임 엔진에 바로 넣을 수 있는 캐릭터 스프라이트 시트**를 프롬프트로 만드는 웹 서비스다.

픽셀 아티스트가 수동으로 하던 일을 줄인다.

1. 칸 크기(16/32/64)를 정하고
2. 같은 캐릭터의 앞/뒤/좌/우 기본 모습 4장을 먼저 확정하고
3. 그 4장을 참고 캐릭터로 넣어 걷기·공격 같은 모션 시트를 만들고
4. 옆에서 모션을 미리보기한 뒤
5. PNG 시트와 GIF를 받는다.

목표는 “예쁜 일러스트 한 장”이 아니다. **프레임이 칸에 맞춰진 시트**다.
상업용 완성 아트를 대체한다고 약속하지 않는다. 인디 프로토타입 / 기획 공유 / 학습용 시트를 빠르게 뽑는 도구다.

대상:

- 인디 게임 개발자
- 픽셀 아트 입문자
- 모션 GIF가 필요한 기획자

---

## 2. 제품이 어떻게 작동하는가 (사용자 관점)

한 페이지 스튜디오. 단계는 반드시 이 순서다. 2단계를 1단계보다 먼저 열지 마라.

```
[1 스프라이트 크기] → [2 캐릭터 기본 모습 4장] → [3 모션 시트 생성] → [4 미리보기] → [5 다운로드]
```

### 2.1 화면 레이아웃

단일 페이지 `/` (랜딩을 따로 두지 않아도 된다. v1은 스튜디오가 홈).

```
+--------------------------------------------------------------+
| Spritex AI                                                    |
| ① 기본 모습    ② 스프라이트 시트                              |
+----------------------------+---------------------------------+
| 왼쪽: 옵션 / 프롬프트      | 오른쪽: 결과 + 모션 미리보기     |
|                            |                                 |
| (단계 1)                   | 기본 모습: 앞 뒤 좌 우 4칸      |
|  크기 / 시점 / 캐릭터 프롬프트| 시트: 가로로 붙은 프레임         |
|  [기본 모습 생성]          | 캔버스 미리보기 (재생/정지)     |
|                            | [시트 PNG] [GIF]                |
| (단계 2, 1 완료 후 활성)   |                                 |
|  참고 캐릭터(자동 주입)    |                                 |
|  프레임 수 / FPS           |                                 |
|  Inplace / 루프            |                                 |
|  모션 프롬프트             |                                 |
|  [스프라이트 시트 생성]    |                                 |
+----------------------------+---------------------------------+
```

미리보기는 **시트 이미지 옆**에 둔다. 시트를 보여 주는 것과 재생하는 것은 다른 패널이다.

### 2.2 사용자가 만지는 옵션 (값까지 고정)

| 키 | UI | 값 | 기본 |
| --- | --- | --- | --- |
| `spriteSize` | 라디오 | `16` \| `32` \| `64` | `32` |
| `view` | 라디오 | `side` \| `top` \| `quarter` | `side` |
| `frameCount` | 숫자 | 4–16 정수. 시트 그림 장수. 바꾸면 재생성 | `8` |
| `fps` | 숫자 | 4–24 정수. 초당 재생 장수. 미리보기/GIF에 바로 반영 | `8` |
| `inplace` | 토글 | `true` = 제자리 고정, `false` = 칸 안 오프셋 허용 | `true` |
| `loop` | 라디오 | `looping` \| `oneshot` | `looping` |
| `characterPrompt` | textarea | 캐릭터가 누구인지 | 빈 값이면 생성 불가 |
| `motionPrompt` | textarea | 무슨 모션인지 | 빈 값이면 시트 생성 불가 |
| `referenceImages` | 업로드 + 자동 | PNG/WebP, 최대 4장 | 단계 1 결과로 자동 채움 |

크기·시점·루프·프레임 수는 **프롬프트에 다시 적게 하지 마라**. 컨트롤 값이 소스 오브 트루스다. 서버가 프롬프트를 조립할 때 이 값들을 넣는다.

시점 의미:

- `side`: 횡스크롤 / 플랫포머. 기본 4장은 보통 오른쪽을 보는 옆모습 + 뒤/앞이 어색할 수 있으므로 **앞, 뒤, 왼쪽(좌우 반전용), 오른쪽**으로 명시한다.
- `top`: 탑다운. 카메라가 거의 위. 앞=남(카메라 쪽), 뒤=북, 좌, 우.
- `quarter`: 쿼터뷰 / 3/4 overhead RPG. 탑과 비슷하되 캐릭터 앞면이 조금 더 보인다.

Inplace:

- On: 발(불투명 픽셀의 하단 중심)이 모든 프레임에서 같은 칸 좌표. 엔진이 캐릭터 x,y를 옮긴다.
- Off: 돌진·구르기처럼 칸 안에서 캐릭터가 실제로 이동해도 된다. 후처리로 발을 고정하지 않는다.

루프:

- `looping`: 미리보기와 GIF가 무한 반복. 걷기/idle.
- `oneshot`: 모션을 한 번 재생한 뒤 **단계 1의 idle(앞모습)** 로 멈춘다. 공격/피격. GIF는 모션 프레임 + idle 1장을 붙이고 루프 횟수 1(또는 0회 반복 = 한 번만 재생).

다운로드:

- 스프라이트 시트: 투명 PNG. 가로 1줄, 칸 크기 = `spriteSize`. 전체 폭 = `spriteSize * frameCount`, 높이 = `spriteSize`.
- GIF: 미리보기와 같은 FPS / 루프. 픽셀이 뭉개지면 안 된다.

### 2.3 단계 1 — 기본 모습 4장

입력: `spriteSize`, `view`, `characterPrompt`, 선택 업로드 1장.

출력: `BaseCharacter`

- `directions.front | back | left | right`: 각 `spriteSize x spriteSize` PNG (RGBA)
- `turnaroundSheet`: 4칸을 가로로 붙인 PNG (미리보기용)
- 이 네 장이 단계 2의 기본 참고 캐릭터다.

### 2.4 단계 2 — 모션 시트

입력: 단계 1의 참고 이미지들 + `frameCount` + `fps` + `inplace` + `loop` + `motionPrompt`.

출력: `SpriteJobResult`

- `sheetPng`: 1행 N열 시트
- `frames[]`: 각 칸 PNG
- `preview`용 프레임 시퀀스 (oneshot이면 끝에 idle 포함)
- `gif` 바이트

---

## 3. 내부가 어떻게 작동하는가 (파이프라인)

이미지 모델은 **16x16을 직접 그리지 못한다.** 큰 해상도로 그리드 시트를 받은 뒤, 우리가 자르고 nearest-neighbor로 내린다.

```
사용자 옵션 + 프롬프트
        │
        ▼
서버가 모델용 프롬프트 조립 (시점/프레임 수/그리드/Inplace/픽셀아트 지시)
        │
        ▼
Gemini 이미지 생성/편집 (`gemini-2.5-flash-image`, 흰 배경 그리드)
        │
        ▼
코너 플러드필로 배경 제거 (투명 PNG)
        │
        ▼
그리드를 균등 분할해 프레임 추출
        │
        ▼
각 프레임을 spriteSize로 nearest-neighbor 리사이즈
        │
        ▼
inplace=true 이면 발(하단 중심)을 칸의 같은 좌표로 정렬
        │
        ▼
가로 시트 합성 + 미리보기 시퀀스 + GIF 인코딩
        │
        ▼
클라이언트로 PNG/GIF/프레임 메타 반환
```

### 3.1 단계 1 생성

1. 프로토타입은 호출을 한 번으로 줄였다. Gemini `gemini-2.5-flash-image`에 2x2 턴어라운드를 바로 요청한다.
2. 업로드가 있으면 `inlineData`로 같이 보낸다.
3. 칸 배치: 좌상=front, 우상=right, 좌하=back, 우하=left.
4. 코너 플러드필로 흰(또는 코너와 비슷한) 배경을 지운다.
5. 2x2를 4등분 → 각 셀 contain + nearest로 `spriteSize`에 맞추고 발은 칸 하단에 둔다.

### 3.2 단계 2 생성

1. 참고 이미지: 4방향 PNG를 Gemini `contents`에 `inlineData`로 넣는다.
2. `gemini-2.5-flash-image`로 **N프레임 그리드 시트**를 요청한다.
   - `frameCount` 4 → 2x2
   - 5–8 → 4x2 (빈 칸이 생기면 프롬프트에 “마지막 칸은 비우지 말고 프레임을 채워라” 또는 실제 쓰는 칸만 자르기)
   - 9–16 → 4x4
3. 그리드 읽는 순서는 **행 우선, 왼쪽→오른쪽, 위→아래**. 이게 재생 순서다.
4. 코너 플러드필로 배경 제거.
5. 균등 그리드 크롭. (v1은 콘텐츠 인식 슬라이싱 없음. 모델이 칸을 살짝 삐뚤어도 균등 분할한다.)
6. 리사이즈 + (옵션) inplace 정렬 + 1행 시트로 재합성.

### 3.3 모델용 프롬프트에 항상 넣을 것

서버가 붙인다. 사용자가  squish 하지 않아도 된다.

- `detailed pixel art sprite, game asset, full body, not a portrait crop`
- `plain white background, no scenery, no UI, no watermark`
- `same character in every frame, same colors, same outfit, same silhouette`
- 시점 문장 (`view`)
- 그리드 문장 (`NxM sprite sheet, equal cells, no gaps, no overlapping`)
- inplace면 `character stays in the same position in every cell, only limbs move, no translation`
- looping이면 `first and last frame should connect as a cycle`
- oneshot이면 `anticipation → action → recovery, does not loop, last frame is recoverable to idle`

픽셀 스타일 기본 문구 (단계 1·2 공통):

```
detailed 32-bit pixel art style (SNES / 16-bit-era game sprite), crisp pixels,
readable silhouette, limited palette, no photorealism, no 3D render
```

`spriteSize`가 16이면 프롬프트에 `very low resolution chibi / tiny sprite, chunky pixels`를 보강한다. 그래도 생성 해상도는 1K로 두고 우리가 16으로 내린다.

### 3.4 Inplace 후처리 (직접 구현)

각 프레임 RGBA:

1. 알파 > 8 인 픽셀의 bounding box를 구한다.
2. “발” = bbox 하단 변의 수평 중심 `(cx, feetY)`.
3. 목표: `feet` 가 칸 좌표 `(spriteSize/2, spriteSize - 1 - pad)` 에 오도록 이동. `pad`는 1~2px.
4. 캔버스 밖으로 나가면 bbox를 칸 안에 맞게 스케일(nearest) 후 다시 맞춘다.
5. inplace=false면 이 단계를 건너뛰고, bbox를 칸에 contain만 한다 (잘리지 않게).

### 3.5 미리보기 플레이어

브라우저 Canvas 2D.

- `imageSmoothingEnabled = false`
- CSS `image-rendering: pixelated`
- 표시 배율은 정수만 (x4, x8). 32px 칸을 4.5배로 그리지 마라.
- `requestAnimationFrame` + 누적 시간으로 한 장당 `1000/fps` ms. 8 FPS면 1초에 정확히 8장이 넘어간다.
- FPS는 재생 속도일 뿐이라 시트를 다시 뽑지 않는다. 미리보기와 GIF 다운로드가 현재 슬라이더 값을 따른다.
- oneshot: 인덱스가 마지막 모션 프레임을 지나면 idle 프레임을 고정. 재생 버튼으로만 다시 시작.
- 컨트롤: 재생, 정지, 프레임 스크러버.

### 3.6 GIF

- 팔레트 양자화는 시트 전체에서 한 번만 (프레임마다 팔레트가 바뀌면 깜빡인다).
- 투명색 유지.
- delay = `gifDelayMs(fps)` (10ms 단위, 8 FPS → 130ms). 미리보기는 정확한 `1000/fps` ms.
- looping: Netscape loop 0 (무한).
- oneshot: 모션 프레임 + idle, loop 1회.

---

## 4. 확정 기술 스택

다른 프레임워크로 시작하지 마라. 이 조합으로 간다.

### 앱

| 용도 | 선택 | 이유 |
| --- | --- | --- |
| 프레임워크 | **Next.js (App Router) + TypeScript** | 프론트와 API를 한 레포, Vercel 배포 쉬움 |
| 스타일 | **Tailwind CSS** | 컨트롤 많은 툴 UI를 빨리 짬 |
| 검증 | **zod** | `/api` 바디 검증 |
| 생성 API | **Gemini** (`@google/genai`, `gemini-2.5-flash-image`) | 텍스트/참고이미지 → 그리드 시트 |
| 이미지 처리 | **sharp** | 크롭, 합성, nearest resize, PNG |
| GIF | **gifenc** | 서버에서 팔레트 GIF |
| 상태 | 클라이언트는 React state. 전역이 필요하면 zustand 한 개 | v1에 DB 없음 |

패키지 매니저: **pnpm** (없으면 npm도 허용). React 실험 컴파일러 같은 비필수 옵션은 켜지 마라.

앱 루트는 저장소 루트다. `apps/` 모노레포로 쪼개지 마라.

### Gemini

모델: `gemini-2.5-flash-image` (Nano Banana). 품질을 올리면 `gemini-3-pro-image-preview`로 바꿀 수 있다.

키 우선순위:

1. 요청 헤더 `x-gemini-api-key` (스튜디오에 사용자가 붙인 키)
2. 서버 환경변수 `GEMINI_API_KEY`
3. 둘 다 없으면 **목 생성**. UI에 데모 모드를 표시한다. 앱을 멈추지 마라.

사용자 키는 서버에 저장하지 않는다. 브라우저 localStorage/sessionStorage만 쓴다. 클라이언트 번들에 `NEXT_PUBLIC_` 키를 넣지 마라. 모든 Gemini 호출은 Route Handler에서만.

### 환경 변수

`.env.local` (커밋 금지):

```
GEMINI_API_KEY=...
```

### 호스트 / 런타임

- Node.js 20+
- sharp는 네이티브 바이너리가 필요하다. serverless에서 막히면 `@img/sharp-linux-x64` 또는 해당 플랫폼 optional dep를 확인한다.
- 생성은 수십 초가 걸린다. Next Route Handler에서 fal `subscribe`로 기다린다. 타임아웃이 짧으면 `maxDuration`을 60–120초로 올린다.

---

## 5. 권장 파일 구조

스캐폴드할 때 이 모양을 목표로 한다. 이름을 크게 바꾸지 마라.

```
/
  AGENTS.md                 ← 이 파일
  README.md
  LICENSE
  package.json
  next.config.ts
  tsconfig.json
  .env.example              ← FAL_KEY만 명시
  .gitignore
  app/
    layout.tsx
    page.tsx                ← 스튜디오 UI
    globals.css
    api/
      character/route.ts    ← 단계 1
      sprite/route.ts       ← 단계 2
  components/
    Studio.tsx
    OptionPanel.tsx
    PreviewPlayer.tsx
    SheetViewer.tsx
  lib/
    types.ts                ← 아래 타입을 그대로 둬라
    prompts.ts              ← 모델 프롬프트 조립
    gemini.ts               ← Gemini 이미지 생성 래퍼
    sheet.ts                ← 크롭 / 리사이즈 / inplace / 합성
    gif.ts                  ← gifenc
    mock.ts                 ← FAL_KEY 없을 때 체커보드 프레임
  public/
```

인증, Prisma, Supabase, 업로드 스토리지는 v1에 넣지 않는다. 생성 결과는 메모리/일시 URL로 클라이언트에 내려주고, 브라우저가 PNG/GIF를 다운로드한다.

---

## 6. 공유 타입 (그대로 구현)

```ts
export type SpriteSize = 16 | 32 | 64;
export type ViewType = "side" | "top" | "quarter";
export type LoopMode = "looping" | "oneshot";

export type StudioOptions = {
  spriteSize: SpriteSize;
  view: ViewType;
  frameCount: number; // 4..16
  fps: number; // 4..24
  inplace: boolean;
  loop: LoopMode;
  characterPrompt: string;
  motionPrompt: string;
};

export type Direction = "front" | "right" | "back" | "left";

export type BaseCharacter = {
  spriteSize: SpriteSize;
  view: ViewType;
  prompt: string;
  /** data URL or remote URL, RGBA PNG, spriteSize x spriteSize */
  directions: Record<Direction, string>;
  turnaroundSheetDataUrl: string;
};

export type SpriteJobResult = {
  spriteSize: SpriteSize;
  frameCount: number;
  fps: number;
  inplace: boolean;
  loop: LoopMode;
  /** 1-row sheet PNG data URL */
  sheetDataUrl: string;
  /** each frame PNG data URL, length === frameCount */
  frames: string[];
  /** preview sequence; oneshot appends idle (front) at the end */
  previewFrames: string[];
  gifDataUrl: string;
};
```

API는 JSON으로 data URL 또는 짧은 수명의 fal CDN URL을 반환해도 된다. 클라이언트는 결국 data URL/Blob로 다운로드한다.

---

## 7. 구현 순서 (이 순서대로 해라)

막히지 않으려면 생성 API보다 **시트 도구**를 먼저 완성한다.

1. Next.js + Tailwind 스캐폴드, 한국어 스튜디오 UI, 모든 컨트롤. 생성은 아직 목.
2. `PreviewPlayer` + 정수 배율 픽셀 캔버스. looping / oneshot / fps가 목 프레임에서 동작.
3. `lib/sheet.ts`: 그리드 슬라이스, nearest resize, inplace, 1행 합성. 단위 테스트 또는 스크립트로 색 사각형 시트를 넣어 검증.
4. `lib/gif.ts`: 같은 목 프레임으로 GIF 다운로드.
5. `.env.example` + `lib/gemini.ts`. 키 없으면 목 생성 + 데모 배너.
6. `POST /api/character` 단계 1 실생성.
7. `POST /api/sprite` 단계 2 실생성. 참고 이미지 필수.
8. 로딩/에러/재생성. 단계 2는 단계 1 없이 비활성.
9. README에 “로컬 실행: pnpm i, FAL_KEY, pnpm dev” 한 블록만 추가해도 된다. 소개 본문은 유지.

각 단계가 끝날 때마다 커밋한다.

---

## 8. 주의점 (여기서 많이 터진다)

1. **생성 해상도 ≠ 스프라이트 크기.** 모델을 16px로 돌리지 마라. 1K(또는 정사각 HD)로 받은 뒤 nearest로 내린다. lanczos/bilinear로 내리면 픽셀아트가 죽는다.
2. **미리보기 스케일은 정수배.** `imageSmoothingEnabled = false` + `image-rendering: pixelated`.
3. **시트 레이아웃은 우리가 다시 만든다.** 모델이 준 2x2/4x2 이미지는 중간 산물이다. 엔진용 최종본은 항상 `frameCount * spriteSize` 가로 1줄 PNG.
4. **캐릭터 일관성.** 모션만 单独 생성하면 머리/옷이 매 프레임 바뀐다. 반드시 단계 1 이미지를 `image_urls`로 넣는다. 시드/스타일만 믿고 텍스트만 보내지 마라.
5. **배경.** 게임 스프라이트는 투명이 기본이다. Gemini 결과의 흰 배경은 후처리로 지운다.
6. **Inplace는 모델에게만 맡기지 마라.** 프롬프트에 적더라도 후처리로 발을 맞춘다. Off일 때만 후처리를 끈다.
7. **One-shot idle.** 미리보기가 모션 끝에 빈 화면이 되면 실패다. 단계 1 `front`를 같은 `spriteSize`로 맞춰 마지막에 붙인다.
8. **API 키.** 서버 `GEMINI_API_KEY` 또는 사용자가 입력한 키. 클라이언트 번들/`NEXT_PUBLIC_` 금지. 사용자 키는 헤더로만 전달.
9. **비용/시간.** 프로토타입은 단계당 Gemini 1회. 버튼을 연타하지 못하게 in-flight 락을 건다.
10. **콘텐츠.** 아동 성착취 등 명백한 불법 요청은 서버에서 400. Gemini 세이프티에만 맡기지 마라.
11. **라이선스.** 사용자 프롬프트로 나온 픽셀은 프로토타입용이라고 README에 이미 적혀 있다. 타사 상용 캐릭터 IP를 참고 이미지로 넣으라고 유도하는 카피를 쓰지 마라.
12. **v1에 넣지 말 것:** 로그인, 결제, 커뮤니티 갤러리, 동영상 내보내기, Unity 패키지, 자체 GPU, 커스텀 LoRA 학습, 맵/타일셋/배경 패럴랙스. 캐릭터 시트만.
13. **테스트 없이 UI만 올리지 마라.** 브라우저가 있으면 생성 목 경로라도 미리보기 재생·PNG/GIF 다운로드를 직접 눌러 봐라.
14. **Git.** 기능 브랜치에서 작업하고, 시크릿을 커밋하지 마라. `.env.local`은 gitignore.

---

## 9. 단계별 프롬프트 뼈대 (복붙 후 조립)

구현 시 `lib/prompts.ts`로 옮겨라. 사용자 입력은 끝에 붙이고, 사용자 문구가 시스템 지시를 덮어쓰지 않게 시스템 블록을 앞에 둔다.

### 정면 캐릭터

```
Generate a single character only, centered, full body from head to feet,
plain white background, no ground shadow scenery, no text.
{PIXEL_STYLE}
Viewpoint: {VIEW_SENTENCE}
Idle standing pose, suitable as a game sprite turnaround source.
Character: {characterPrompt}
```

### 4방향 2x2

```
Edit this exact character into a 2x2 sprite turnaround sheet on a plain white background.
Equal-sized cells, no gaps, no labels, no numbers.
Top-left: FRONT ({frontDesc})
Top-right: RIGHT side
Bottom-left: BACK
Bottom-right: LEFT side
Same outfit, colors, proportions in every cell. Only the facing direction changes.
{PIXEL_STYLE}
Viewpoint: {VIEW_SENTENCE}
```

`VIEW_SENTENCE` 예:

- side: `classic 2D side-scroller, camera at character height, side profile for left/right, clear front and back views`
- top: `top-down game sprite, camera above, slight 3/4 so the character is readable, facing south in the front cell`
- quarter: `quarter-view RPG sprite, 3/4 overhead like SNES-era top-down RPG`

### 모션 시트

```
Create a {COLS}x{ROWS} pixel-art sprite sheet of THIS SAME character.
{frameCount} animation frames, equal cells, left-to-right then top-to-bottom reading order,
plain white background, no labels.
Motion: {motionPrompt}
{PIXEL_STYLE}
Viewpoint: {VIEW_SENTENCE}
{INPLACE_SENTENCE}
{LOOP_SENTENCE}
Keep identity identical to the reference images.
```

---

## 10. 로컬에서 다음 세션이 할 일 (체크리스트)

키가 없어도 1–4는 완료할 수 있다.

- [ ] Next.js 앱이 `pnpm dev`로 뜬다
- [ ] 크기/시점/프레임/FPS/Inplace/루프/프롬프트 UI가 있다
- [ ] 목 프레임으로 미리보기가 루프/원샷대로 돈다
- [ ] 목 시트를 PNG로 받고, GIF로 받는다
- [ ] GEMINI_API_KEY 또는 사용자 키가 있으면 단계 1 → 단계 2 실생성
- [ ] 최종 시트 칸 크기가 선택한 16/32/64와 정확히 같다

막히면 이 파일을 다시 읽고, README의 제품 언어와 모순되지 않게 짜라. 제품 결정을 뒤집지 마라 (예: 크기를 128로 늘리기, 단계를 한 방에 합치기, 3D 모델 출력).

---

## 11. 오너 컨텍스트

- 사용자 이름: 동균
- GitHub: wlsgksqls
- 선호: 코드로 바로 만들고 디버깅. 장황한 재기획보다 동작하는 스튜디오.
- 이전 세션: README + AGENTS.md 작성 후 프로토타입 스튜디오(Gemini, 사용자 키 입력)를 붙임.
