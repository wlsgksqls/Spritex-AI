const BLOCKED = [
  /child\s*porn/i,
  /\bcsam\b/i,
  /child\s*sexual/i,
  /sexual\s*(content|act).*(minor|child|underage)/i,
  /(minor|child|underage).*(sexual|nude|porn)/i,
];

export function assertSafePrompt(text: string): void {
  const normalized = text.trim();
  if (!normalized) {
    throw new Error("프롬프트를 입력하세요.");
  }
  if (BLOCKED.some((pattern) => pattern.test(normalized))) {
    throw new Error("이 요청은 처리할 수 없습니다.");
  }
}
