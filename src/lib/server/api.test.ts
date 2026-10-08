import assert from "node:assert/strict";
import { test, type TestContext } from "node:test";
import { GET } from "../../app/api/config/route";
import { POST } from "../../app/api/courses/route";
import { courseSchema } from "../types";

function unsetKeys(context: TestContext) {
  const deepseek = process.env.DEEPSEEK_API_KEY;
  const openai = process.env.OPENAI_API_KEY;
  const tavily = process.env.TAVILY_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  delete process.env.OPENAI_API_KEY;
  delete process.env.TAVILY_API_KEY;
  context.after(() => {
    if (deepseek !== undefined) process.env.DEEPSEEK_API_KEY = deepseek;
    else delete process.env.DEEPSEEK_API_KEY;
    if (openai !== undefined) process.env.OPENAI_API_KEY = openai;
    else delete process.env.OPENAI_API_KEY;
    if (tavily !== undefined) process.env.TAVILY_API_KEY = tavily;
    else delete process.env.TAVILY_API_KEY;
  });
}

const request = (body: unknown) => new Request("http://localhost/api/courses", {
  method: "POST",
  body: JSON.stringify(body),
  headers: { "Content-Type": "application/json" },
});

test("public config exposes only a capability boolean", async (context) => {
  unsetKeys(context);
  assert.deepEqual(await GET().json(), { aiAvailable: false });
  process.env.DEEPSEEK_API_KEY = "private-deepseek-test-key";
  process.env.TAVILY_API_KEY = "private-test-key";
  assert.deepEqual(await GET().json(), { aiAvailable: true });
});

test("availability requires DeepSeek and Tavily keys, including whitespace validation", async (context) => {
  unsetKeys(context);
  process.env.OPENAI_API_KEY = "unused-openai-test-key";
  process.env.TAVILY_API_KEY = "private-tavily-test-key";
  assert.deepEqual(await GET().json(), { aiAvailable: false });
  const legacyOnly = await POST(request({ topic: "Docker 기초", level: "intro", mode: "ai" }));
  assert.equal(legacyOnly.status, 503);
  assert.equal((await legacyOnly.json()).error.code, "AI_NOT_CONFIGURED");
  process.env.DEEPSEEK_API_KEY = "   ";
  assert.deepEqual(await GET().json(), { aiAvailable: false });
  process.env.DEEPSEEK_API_KEY = "private-deepseek-test-key";
  delete process.env.TAVILY_API_KEY;
  assert.deepEqual(await GET().json(), { aiAvailable: false });
  process.env.TAVILY_API_KEY = "   ";
  assert.deepEqual(await GET().json(), { aiAvailable: false });
  process.env.TAVILY_API_KEY = "private-tavily-test-key";
  const response = await GET().text();
  assert.equal(response, '{"aiAvailable":true}');
  assert.ok(!response.includes("private-") && !response.includes("unused-"));
});

test("AI without credentials returns actionable 503 instead of a demo course", async (context) => {
  unsetKeys(context);
  const response = await POST(request({ topic: "Docker 기초", level: "intro", mode: "ai" }));
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, "AI_NOT_CONFIGURED");
});

test("invalid generation requests are rejected before external calls", async () => {
  for (const body of [
    { topic: " ", level: "intro", mode: "ai" },
    { topic: "Docker", level: "expert", mode: "ai" },
    { topic: "Docker", level: "intro", mode: "unknown" },
  ]) {
    const response = await POST(request(body));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, "INVALID_INPUT");
  }
});

test("demo streams an honest preparation stage and fixed authored Docker course", async (context) => {
  unsetKeys(context);
  const response = await POST(request({ topic: "경제학", level: "intermediate", mode: "demo" }));
  assert.equal(response.status, 200);
  assert.ok(response.headers.get("Content-Type")?.includes("application/x-ndjson"));
  const events = (await response.text()).trim().split("\n").map((line) => JSON.parse(line));
  assert.deepEqual(events.map((event) => event.type), ["progress", "course"]);
  assert.equal(events[0].stage, "validation");
  const course = courseSchema.parse(events[1].course);
  assert.equal(course.mode, "demo");
  assert.equal(course.topic, "Docker 기초 배우기");
  assert.equal(course.level, "intro");
  assert.equal(course.chapters.flatMap((chapter) => chapter.lessons).length, 9);
});
