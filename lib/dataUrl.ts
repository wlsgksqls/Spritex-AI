export function bufferToPngDataUrl(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString("base64")}`;
}

export function parseDataUrl(dataUrl: string): { mimeType: string; buffer: Buffer; base64: string } {
  const match = dataUrl.trim().match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error("이미지 데이터 URL 형식이 아닙니다.");
  }
  return {
    mimeType: match[1],
    buffer: Buffer.from(match[2], "base64"),
    base64: match[2],
  };
}
