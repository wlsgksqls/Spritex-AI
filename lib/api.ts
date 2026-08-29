import { z } from "zod";
import { parseDataUrl } from "./dataUrl";
import { encodeGif } from "./gif";
import { GEMINI_IMAGE_MODEL } from "./gemini";
import { runCharacterJob, runSpriteJob } from "./jobs";
import { hasServerGeminiKey, resolveGeminiApiKey, type GeminiEnv } from "./keys";

const CharacterBody = z.object({
  spriteSize: z.union([z.literal(16), z.literal(32), z.literal(64)]),
  view: z.enum(["side", "top", "quarter"]),
  characterPrompt: z.string().min(1).max(2000),
  referenceDataUrl: z.string().optional(),
});

const SpriteBody = z.object({
  spriteSize: z.union([z.literal(16), z.literal(32), z.literal(64)]),
  view: z.enum(["side", "top", "quarter"]),
  frameCount: z.number().int().min(4).max(16),
  fps: z.number().int().min(4).max(24),
  inplace: z.boolean(),
  loop: z.enum(["looping", "oneshot"]),
  characterPrompt: z.string().min(1).max(2000),
  motionPrompt: z.string().min(1).max(2000),
  directions: z.object({
    front: z.string(),
    right: z.string(),
    back: z.string(),
    left: z.string(),
  }),
});

const GifBody = z.object({
  frames: z.array(z.string().min(1)).min(1).max(24),
  fps: z.number().int().min(1).max(24),
  loop: z.enum(["looping", "oneshot"]),
});

function json(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...cors },
  });
}

export async function handleApi(
  request: Request,
  env: GeminiEnv,
  cors: Record<string, string>,
): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "") || "/";

  if (request.method === "GET" && (path === "/api/config" || path === "/config")) {
    return json(
      { hasServerKey: hasServerGeminiKey(env), model: GEMINI_IMAGE_MODEL },
      200,
      cors,
    );
  }

  if (request.method !== "POST") return null;

  try {
    if (path === "/api/character" || path === "/character") {
      const body = CharacterBody.parse(await request.json());
      const result = await runCharacterJob({
        ...body,
        apiKey: resolveGeminiApiKey(request, env),
      });
      return json(result, 200, cors);
    }

    if (path === "/api/sprite" || path === "/sprite") {
      const body = SpriteBody.parse(await request.json());
      const result = await runSpriteJob({
        ...body,
        apiKey: resolveGeminiApiKey(request, env),
      });
      return json(result, 200, cors);
    }

    if (path === "/api/gif" || path === "/gif") {
      const body = GifBody.parse(await request.json());
      const buffers = body.frames.map((frame) => parseDataUrl(frame).buffer);
      const gif = await encodeGif(buffers, body.fps, body.loop);
      return json(
        {
          gifDataUrl: `data:image/gif;base64,${gif.toString("base64")}`,
          fps: body.fps,
        },
        200,
        cors,
      );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "요청에 실패했습니다.";
    const status =
      message.includes("프롬프트") ||
      message.includes("처리할 수 없습니다") ||
      message.includes("프레임") ||
      message.includes("FPS") ||
      message.includes("이미지 데이터")
        ? 400
        : 500;
    return json({ error: message }, status, cors);
  }

  return null;
}
