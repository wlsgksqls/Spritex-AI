import { GEMINI_IMAGE_MODEL } from "@/lib/gemini";
import { hasServerGeminiKey } from "@/lib/keys";

export async function GET() {
  return Response.json({
    hasServerKey: await hasServerGeminiKey(),
    model: GEMINI_IMAGE_MODEL,
  });
}
