import { handleApi } from "../../lib/api";

export type WorkerEnv = {
  GEMINI_API_KEY?: string;
  ALLOWED_ORIGINS?: string;
};

function isAllowedOrigin(origin: string, env: WorkerEnv): boolean {
  if (origin === "http://127.0.0.1:3000" || origin === "http://localhost:3000") return true;
  if (origin === "https://spritex-ai.pages.dev") return true;
  try {
    const host = new URL(origin).hostname;
    if (host === "spritex-ai.pages.dev" || host.endsWith(".spritex-ai.pages.dev")) return true;
  } catch {
    return false;
  }
  return (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .includes(origin);
}

function corsHeaders(request: Request, env: WorkerEnv): Record<string, string> {
  const origin = request.headers.get("Origin");
  const allow = origin && isAllowedOrigin(origin, env) ? origin : "https://spritex-ai.pages.dev";
  return {
    "Access-Control-Allow-Origin": allow,
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-gemini-api-key",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

const worker = {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors });
    }

    const handled = await handleApi(request, env, cors);
    if (handled) return handled;

    return new Response(JSON.stringify({ error: "찾을 수 없는 API입니다." }), {
      status: 404,
      headers: { "Content-Type": "application/json", ...cors },
    });
  },
};

export default worker;
