declare global {
  interface CloudflareEnv {
    /** Cloudflare dashboard secret. Never commit this value. */
    GEMINI_API_KEY?: string;
  }
}

export {};
