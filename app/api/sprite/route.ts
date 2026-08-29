import { z } from "zod";
import { runSpriteJob } from "@/lib/jobs";
import { resolveGeminiApiKey } from "@/lib/keys";

export const maxDuration = 120;

const Body = z.object({
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

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = Body.parse(json);
    const result = await runSpriteJob({
      ...body,
      apiKey: await resolveGeminiApiKey(request),
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "스프라이트 시트 생성에 실패했습니다.";
    const status = message.includes("프레임") || message.includes("FPS") || message.includes("프롬프트") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
