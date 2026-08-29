export function resolveGeminiApiKey(request: Request): string | null {
  const header = request.headers.get("x-gemini-api-key")?.trim();
  if (header) return header;
  const envKey = process.env.GEMINI_API_KEY?.trim();
  return envKey || null;
}

export function hasServerGeminiKey(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}
