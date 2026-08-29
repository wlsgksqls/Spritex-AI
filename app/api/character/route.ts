import { z } from "zod";
import { runCharacterJob } from "@/lib/jobs";
import { resolveGeminiApiKey } from "@/lib/keys";

export const maxDuration = 120;

const Body = z.object({
  spriteSize: z.union([z.literal(16), z.literal(32), z.literal(64)]),
  view: z.enum(["side", "top", "quarter"]),
  characterPrompt: z.string().min(1).max(2000),
  referenceDataUrl: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const body = Body.parse(json);
    const result = await runCharacterJob({
      ...body,
      apiKey: resolveGeminiApiKey(request),
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "기본 모습 생성에 실패했습니다.";
    const status = message.includes("프롬프트") || message.includes("처리할 수 없습니다") ? 400 : 500;
    return Response.json({ error: message }, { status });
  }
}
