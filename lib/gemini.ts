import { GoogleGenAI } from "@google/genai";
import type { ImageInput } from "./types";

export const GEMINI_IMAGE_MODEL = "gemini-2.5-flash-image";

function extractImageBase64(response: {
  candidates?: Array<{ content?: { parts?: Array<{ inlineData?: { data?: string }; text?: string }> } }>;
}): { imageBase64: string; text: string } {
  const parts = response.candidates?.[0]?.content?.parts ?? [];
  let imageBase64 = "";
  const texts: string[] = [];
  for (const part of parts) {
    if (part.inlineData?.data) {
      imageBase64 = part.inlineData.data;
    } else if (part.text) {
      texts.push(part.text);
    }
  }
  return { imageBase64, text: texts.join("\n").trim() };
}

export async function generateGeminiImage(opts: {
  apiKey: string;
  prompt: string;
  images?: ImageInput[];
  aspectRatio: string;
}): Promise<Buffer> {
  const ai = new GoogleGenAI({ apiKey: opts.apiKey });
  const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [];
  for (const image of opts.images ?? []) {
    parts.push({
      inlineData: { mimeType: image.mimeType, data: image.base64 },
    });
  }
  parts.push({ text: opts.prompt });

  const response = await ai.models.generateContent({
    model: GEMINI_IMAGE_MODEL,
    contents: [{ role: "user", parts }],
    config: {
      responseModalities: ["TEXT", "IMAGE"],
      imageConfig: {
        aspectRatio: opts.aspectRatio,
      },
    },
  });

  const { imageBase64, text } = extractImageBase64(response);
  if (!imageBase64) {
    throw new Error(
      text
        ? `이미지를 받지 못했습니다. 모델 메시지: ${text.slice(0, 280)}`
        : "Gemini가 이미지를 반환하지 않았습니다. 모델 권한 또는 키를 확인하세요.",
    );
  }
  return Buffer.from(imageBase64, "base64");
}
