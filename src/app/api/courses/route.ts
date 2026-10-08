import { z } from "zod";
import { createDemoCourse } from "@/lib/demo-course";
import { levelSchema, courseSchema } from "@/lib/types";
import { isAiAvailable } from "@/lib/server/config";
import { generateCourse } from "@/lib/server/generate-course";
import { publicGenerationError } from "@/lib/server/errors";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  topic: z.string().trim().min(2).max(200),
  level: levelSchema.default("intro"),
  mode: z.enum(["ai", "demo"]).default("ai"),
}).strict();

function requestError(code: string, message: string, status: number) {
  return Response.json({ error: { code, message } }, { status });
}

export async function POST(request: Request) {
  if (Number(request.headers.get("content-length")) > 4096) {
    return requestError("INVALID_INPUT", "입력한 주제가 너무 깁니다. 200자 이내로 입력해 주세요.", 400);
  }
  let body: unknown;
  try {
    const text = await request.text();
    if (text.length > 4096) {
      return requestError("INVALID_INPUT", "입력한 주제가 너무 깁니다. 200자 이내로 입력해 주세요.", 400);
    }
    body = JSON.parse(text);
  } catch {
    return requestError("INVALID_INPUT", "요청 형식을 읽지 못했습니다. 다시 시도해 주세요.", 400);
  }
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return requestError("INVALID_INPUT", "학습 주제는 2~200자, 학습 수준은 입문·초급·중급 중 하나로 입력해 주세요.", 400);
  }
  if (parsed.data.mode === "ai" && !isAiAvailable()) {
    return requestError("AI_NOT_CONFIGURED", "AI 생성에 필요한 API 키가 설정되지 않았습니다. 체험 코스를 이용하거나 서버 설정 후 다시 시도해 주세요.", 503);
  }

  const cancellation = new AbortController();
  const clientSignal = AbortSignal.any([request.signal, cancellation.signal]);
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: unknown) => {
        if (!clientSignal.aborted) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };
      try {
        const course = parsed.data.mode === "demo"
          ? (() => {
              send({ type: "progress", stage: "validation", message: "미리 준비한 Docker 기초 체험 코스를 확인하고 있어요." });
              return courseSchema.parse(createDemoCourse());
            })()
          : await generateCourse(parsed.data, send, clientSignal);
        send({ type: "course", course });
      } catch (error) {
        const { code, message } = publicGenerationError(error);
        send({ type: "error", code, message });
      } finally {
        if (!clientSignal.aborted) controller.close();
      }
    },
    cancel() {
      cancellation.abort();
    },
  });
  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
      "X-Accel-Buffering": "no",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
