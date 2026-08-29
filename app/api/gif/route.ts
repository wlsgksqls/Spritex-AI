import { z } from "zod";
import { parseDataUrl } from "@/lib/dataUrl";
import { encodeGif } from "@/lib/gif";

export const maxDuration = 30;

const Body = z.object({
  frames: z.array(z.string().min(1)).min(1).max(24),
  fps: z.number().int().min(1).max(24),
  loop: z.enum(["looping", "oneshot"]),
});

export async function POST(request: Request) {
  try {
    const body = Body.parse(await request.json());
    const buffers = body.frames.map((frame) => parseDataUrl(frame).buffer);
    const gif = await encodeGif(buffers, body.fps, body.loop);
    return Response.json({
      gifDataUrl: `data:image/gif;base64,${gif.toString("base64")}`,
      fps: body.fps,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "GIF 인코딩에 실패했습니다.";
    return Response.json({ error: message }, { status: 400 });
  }
}
