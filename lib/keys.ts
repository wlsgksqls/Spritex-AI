export type GeminiEnv = { GEMINI_API_KEY?: string };

function headerGeminiKey(request: Request): string | null {
  return request.headers.get("x-gemini-api-key")?.trim() || null;
}

function envGeminiKey(env?: GeminiEnv): string | null {
  return env?.GEMINI_API_KEY?.trim() || process.env.GEMINI_API_KEY?.trim() || null;
}

export function resolveGeminiApiKey(request: Request, env?: GeminiEnv): string | null {
  return headerGeminiKey(request) || envGeminiKey(env);
}

export function hasServerGeminiKey(env?: GeminiEnv): boolean {
  return Boolean(envGeminiKey(env));
}
