import { getCloudflareContext } from "@opennextjs/cloudflare";

function headerGeminiKey(request: Request): string | null {
  return request.headers.get("x-gemini-api-key")?.trim() || null;
}

async function envGeminiKey(): Promise<string | null> {
  const fromProcess = process.env.GEMINI_API_KEY?.trim();
  if (fromProcess) return fromProcess;
  try {
    const { env } = await getCloudflareContext({ async: true });
    return env.GEMINI_API_KEY?.trim() || null;
  } catch {
    return null;
  }
}

export async function resolveGeminiApiKey(request: Request): Promise<string | null> {
  return headerGeminiKey(request) || (await envGeminiKey());
}

export async function hasServerGeminiKey(): Promise<boolean> {
  return Boolean(await envGeminiKey());
}
