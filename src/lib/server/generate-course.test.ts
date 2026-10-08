import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { curriculumDraftSchema, type CurriculumDraft } from "../types";
import { generateCourse, type GenerationProgress } from "./generate-course";
import { GenerationError, publicGenerationError } from "./errors";

const analysis = {
  normalizedTopic: "Docker 기초",
  learningGoal: "컨테이너의 동작을 이해합니다.",
  scope: ["이미지", "컨테이너", "네트워크"],
  prerequisites: [],
};
const queryPlan = {
  queries: ["Docker official documentation", "Docker educational concepts", "Docker practical tutorial"],
  preferredDomains: ["docker.com"],
};
const summary = "Docker 이미지는 애플리케이션 실행에 필요한 파일과 설정을 포함합니다. 컨테이너는 이미지로 생성한 실행 단위이며, 각 실행의 쓰기 가능한 계층을 별도로 사용합니다.";

function draftFixture(): CurriculumDraft {
  return curriculumDraftSchema.parse({
    title: "Docker 기초 배우기",
    description: "컨테이너의 원리를 배우는 테스트 코스입니다.",
    chapters: Array.from({ length: 3 }, (_, chapterIndex) => ({
      title: `챕터 ${chapterIndex + 1}`,
      description: "기초부터 순서대로 학습합니다.",
      objectives: ["컨테이너의 개념을 설명합니다."],
      lessons: Array.from({ length: 3 }, (_, lessonIndex) => {
        const lessonNumber = chapterIndex * 3 + lessonIndex + 1;
        return {
          title: `레슨 ${lessonNumber}`,
          objectives: ["이미지와 컨테이너를 구분합니다."],
          difficulty: "intro",
          estimatedMinutes: 5,
          keyConcepts: ["이미지", "컨테이너"],
          content: [{ title: "이미지", body: summary }, { title: "컨테이너", body: summary }],
          examples: [{ title: "교육용 예시", explanation: "같은 이미지로 서로 다른 컨테이너를 만듭니다.", code: null }],
          sourceIds: ["source-1"],
          quiz: Array.from({ length: 3 }, (_, quizIndex) => ({
            question: `${lessonNumber}번 레슨의 ${quizIndex + 1}번 질문: 이미지와 컨테이너의 관계로 옳은 것은?`,
            options: ["이미지로 컨테이너를 생성한다", "이미지는 실행 중인 프로세스다", "컨테이너는 이미지를 삭제한다", "이미지마다 컨테이너가 하나만 가능하다"],
            correctAnswerIndex: 0,
            explanation: "이미지를 바탕으로 컨테이너를 생성합니다.",
          })),
        };
      }),
    })),
  });
}

function modelResponse(output: unknown, model: string) {
  // DeepSeek's documented Responses payload is accepted by the installed adapter.
  return Response.json({
    id: "test-response",
    object: "response",
    created_at: 1,
    model,
    status: "completed",
    output: [{
      type: "message",
      id: "test-message",
      role: "assistant",
      content: [{ type: "output_text", text: JSON.stringify(output), annotations: [] }],
    }],
    usage: { input_tokens: 10, output_tokens: 20 },
    store: false,
  });
}

function mockServices(context: TestContext, options: { sourceCount?: number; draft?: CurriculumDraft; model?: string } = {}) {
  const savedDeepseek = process.env.DEEPSEEK_API_KEY;
  const savedModel = process.env.DEEPSEEK_MODEL;
  const savedOpenaiEndpoint = process.env.OPENAI_BASE_URL;
  const savedTavily = process.env.TAVILY_API_KEY;
  process.env.DEEPSEEK_API_KEY = "unit-test-deepseek-key";
  process.env.TAVILY_API_KEY = "unit-test-tavily-key";
  if (options.model) process.env.DEEPSEEK_MODEL = options.model;
  else delete process.env.DEEPSEEK_MODEL;
  // The explicit provider endpoint must override unrelated legacy settings.
  process.env.OPENAI_BASE_URL = "https://unused-provider.invalid/v1";
  context.after(() => {
    if (savedDeepseek === undefined) delete process.env.DEEPSEEK_API_KEY;
    else process.env.DEEPSEEK_API_KEY = savedDeepseek;
    if (savedModel === undefined) delete process.env.DEEPSEEK_MODEL;
    else process.env.DEEPSEEK_MODEL = savedModel;
    if (savedOpenaiEndpoint === undefined) delete process.env.OPENAI_BASE_URL;
    else process.env.OPENAI_BASE_URL = savedOpenaiEndpoint;
    if (savedTavily === undefined) delete process.env.TAVILY_API_KEY;
    else process.env.TAVILY_API_KEY = savedTavily;
  });
  const calls: string[] = [];
  let modelCalls = 0;
  context.mock.method(globalThis, "fetch", async (url: string, init: RequestInit) => {
    if (String(url) === "https://api.deepseek.com/responses") {
      const body = JSON.parse(init.body as string);
      assert.equal(new Headers(init.headers).get("Authorization"), "Bearer unit-test-deepseek-key");
      assert.equal(body.model, options.model ?? "deepseek-flash");
      assert.deepEqual(body.reasoning, { effort: "none" });
      assert.equal(body.input[0].role, "system");
      assert.ok(body.input[0].content.length > 0);
      assert.ok(body.input.every((item: { role?: string }) => item.role !== "developer"));
      assert.equal(body.text.format.type, "json_schema");
      assert.equal(body.text.format.strict, true);
      assert.equal(body.text.format.schema.type, "object");
      assert.ok(body.text.format.schema.required.length > 0);
      assert.equal(body.text.format.schema.additionalProperties, false);
      calls.push(body.text.format.name);
      modelCalls++;
      return modelResponse(modelCalls === 1 ? analysis : modelCalls === 2 ? queryPlan : options.draft ?? draftFixture(), body.model);
    }
    assert.equal(String(url), "https://api.tavily.com/search");
    assert.equal(new Headers(init.headers).get("Authorization"), "Bearer unit-test-tavily-key");
    calls.push("search");
    return Response.json({ results: Array.from({ length: options.sourceCount ?? 6 }, (_, index) => ({ title: `공식 문서 ${index + 1}`, url: `https://docs.docker.com/guide-${index + 1}`, content: summary, score: 0.9 })) });
  });
  return calls;
}

test("DeepSeek pipeline uses its endpoint, auth, schema, system role and disabled thinking", async (context) => {
  const calls = mockServices(context);
  const events: GenerationProgress[] = [];
  const course = await generateCourse({ topic: "Docker 기초 배우기", level: "intro" }, (event) => events.push(event), new AbortController().signal);
  assert.deepEqual(calls, ["topic_analysis", "search_queries", "search", "search", "search", "learning_curriculum"]);
  assert.deepEqual(events.map((event) => event.stage), ["analysis", "queries", "search", "search", "search", "filter", "curriculum", "validation"]);
  assert.equal(course.mode, "ai");
  assert.equal(course.sources.length, 6);
  assert.equal(course.chapters.length, 3);
  const lessons = course.chapters.flatMap((chapter) => chapter.lessons);
  assert.equal(lessons.length, 9);
  assert.equal(lessons.flatMap((lesson) => lesson.quiz).length, 27);
  assert.ok(lessons.every((lesson) => lesson.quiz.every((question) => question.lessonId === lesson.id)));
  assert.ok(!JSON.stringify(course).includes("unit-test-"));
});

test("optional DeepSeek model selects the documented deepseek-v4-pro Responses model", async (context) => {
  const calls = mockServices(context, { model: "deepseek-v4-pro" });
  await generateCourse({ topic: "Docker 기초", level: "intro" }, () => {}, new AbortController().signal);
  assert.equal(calls.filter((call) => call === "learning_curriculum").length, 1);
});

test("DeepSeek authentication failures never disclose keys or provider bodies", async (context) => {
  mockServices(context);
  context.mock.method(globalThis, "fetch", async (url: string) => {
    assert.equal(String(url), "https://api.deepseek.com/responses");
    return Response.json({ error: { message: "unit-test-deepseek-key private request body", type: "invalid_api_key", code: "invalid_api_key" } }, { status: 401 });
  });
  await assert.rejects(
    generateCourse({ topic: "Docker 기초", level: "intro" }, () => {}, new AbortController().signal),
    (error: unknown) => {
      const sanitized = publicGenerationError(error);
      assert.equal(sanitized.code, "PROVIDER_AUTH");
      assert.ok(!JSON.stringify(sanitized).includes("unit-test-deepseek-key"));
      assert.ok(!JSON.stringify(sanitized).includes("private request body"));
      return true;
    },
  );
});

test("DeepSeek insufficient balance has an actionable sanitized error", async (context) => {
  mockServices(context);
  context.mock.method(globalThis, "fetch", async () => Response.json({ error: { message: "unit-test-deepseek-key private billing details", type: "insufficient_balance", code: "insufficient_balance" } }, { status: 402 }));
  await assert.rejects(
    generateCourse({ topic: "Docker 기초", level: "intro" }, () => {}, new AbortController().signal),
    (error: unknown) => {
      const sanitized = publicGenerationError(error);
      assert.equal(sanitized.code, "INSUFFICIENT_BALANCE");
      assert.equal(sanitized.status, 402);
      assert.ok(!JSON.stringify(sanitized).includes("unit-test-deepseek-key"));
      assert.ok(!JSON.stringify(sanitized).includes("private billing details"));
      return true;
    },
  );
});

test("malformed DeepSeek structured output is rejected without exposing generated text", async (context) => {
  mockServices(context);
  context.mock.method(globalThis, "fetch", async () => modelResponse({ unsupported: "private-invalid-model-output" }, "deepseek-flash"));
  await assert.rejects(
    generateCourse({ topic: "Docker 기초", level: "intro" }, () => {}, new AbortController().signal),
    (error: unknown) => {
      const sanitized = publicGenerationError(error);
      assert.equal(sanitized.code, "INVALID_AI_OUTPUT");
      assert.ok(!JSON.stringify(sanitized).includes("private-invalid-model-output"));
      return true;
    },
  );
});

test("insufficient search sources stop before curriculum generation", async (context) => {
  const calls = mockServices(context, { sourceCount: 3 });
  await assert.rejects(generateCourse({ topic: "Docker 기초", level: "intro" }, () => {}, new AbortController().signal), (error: unknown) => error instanceof GenerationError && error.code === "INSUFFICIENT_SOURCES");
  assert.equal(calls.filter((call) => call === "learning_curriculum").length, 0);
});

test("AI cannot invent a source ID in the persisted course", async (context) => {
  const draft = draftFixture();
  draft.chapters[0].lessons[0].sourceIds = ["invented-source"];
  mockServices(context, { draft });
  await assert.rejects(generateCourse({ topic: "Docker 기초", level: "intro" }, () => {}, new AbortController().signal), (error: unknown) => error instanceof GenerationError && error.code === "INVALID_AI_OUTPUT");
});
