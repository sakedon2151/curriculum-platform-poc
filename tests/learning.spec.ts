import { expect, test, type Page } from "@playwright/test";
import { createDemoCourse } from "../src/lib/demo-course";
import { createProgress, getLessons } from "../src/lib/learning";
import { LEARNING_STORAGE_KEY, LEARNING_STORAGE_VERSION, type LearningStore } from "../src/lib/storage";
import { courseSchema } from "../src/lib/types";

const demo = createDemoCourse();
const lessons = getLessons(demo);
const firstLesson = lessons[0];
const firstLessonPath = `/course/${demo.id}/lesson/${firstLesson.id}`;
const firstQuizPath = `${firstLessonPath}/quiz`;

async function seedCourse(page: Page) {
  await page.addInitScript(({ key, store }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(store));
  }, { key: LEARNING_STORAGE_KEY, store: { version: LEARNING_STORAGE_VERSION, courses: [demo], progress: { [demo.id]: createProgress(demo) } } });
}

async function readStore(page: Page): Promise<LearningStore> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), LEARNING_STORAGE_KEY);
}

async function answerQuiz(page: Page, answerIndexes: number[]) {
  for (const [index, answer] of answerIndexes.entries()) {
    await expect(page.getByRole("heading", { name: firstLesson.quiz[index].question, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "정답 확인", exact: true })).toBeDisabled();
    await page.locator(".quiz-option").nth(answer).click();
    await page.getByRole("button", { name: "정답 확인", exact: true }).click();
    await expect(page.locator(".quiz-feedback")).toContainText(firstLesson.quiz[index].explanation);
    await page.getByRole("button", { name: index === answerIndexes.length - 1 ? "퀴즈 완료하기" : "다음 문제", exact: true }).click();
  }
}

test("홈에서 API 키 없이 실제 Docker 체험 코스를 시작한다", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Docker 데모 체험", exact: true }).click();
  await expect(page).toHaveURL(`/course/${demo.id}`);
  await expect(page.getByRole("heading", { name: demo.title, exact: true })).toBeVisible();
  await expect(page.locator(".lesson-row")).toHaveCount(9);
  await expect(page.locator(".lesson-row.available")).toHaveCount(1);
  await expect(page.locator(".lesson-row.locked")).toHaveCount(8);
  await expect(page.locator(".source-item a")).toHaveCount(demo.sources.length);
  expect((await readStore(page)).courses[0].mode).toBe("demo");
});

test("AI 생성 모의 응답으로 선택한 주제·수준의 코스를 저장하고 새로고침 후 출처를 유지한다", async ({ page }) => {
  const topic = "Docker 실행 환경 이해하기";
  const aiCourse = courseSchema.parse({
    ...createDemoCourse(),
    id: "docker-ai-browser-fixture",
    title: "Docker 실행 환경과 컨테이너",
    topic,
    level: "beginner",
    mode: "ai",
  });
  // Exercise the browser's AI request/NDJSON/persistence flow without a paid provider call.
  await page.route("**/api/config", (route) => route.fulfill({
    status: 200,
    contentType: "application/json",
    body: JSON.stringify({ aiAvailable: true }),
  }));
  await page.route("**/api/courses", (route) => route.fulfill({
    status: 200,
    contentType: "application/x-ndjson; charset=utf-8",
    body: [
      { type: "progress", stage: "analysis", message: "학습 주제와 수준을 살펴보고 있어요." },
      { type: "progress", stage: "search", message: "공식 자료에서 학습 근거를 찾고 있어요." },
      { type: "progress", stage: "curriculum", message: "자료를 바탕으로 레슨을 구성하고 있어요." },
      { type: "progress", stage: "validation", message: "레슨과 퀴즈를 확인하고 있어요." },
      { type: "course", course: aiCourse },
    ].map((event) => JSON.stringify(event)).join("\n") + "\n",
  }));

  await page.goto("/");
  const generateButton = page.getByRole("button", { name: "학습 코스 만들기", exact: true });
  await expect(generateButton).toBeEnabled();
  await page.getByRole("textbox", { name: /학습 주제/ }).fill(`  ${topic}  `);
  await page.getByText("초급", { exact: true }).click();
  await expect(page.getByRole("radio", { name: /초급/ })).toBeChecked();
  const requestPromise = page.waitForRequest((request) => new URL(request.url()).pathname === "/api/courses" && request.method() === "POST");
  await generateButton.click();
  expect((await requestPromise).postDataJSON()).toEqual({ topic, level: "beginner", mode: "ai" });

  await expect(page).toHaveURL(`/course/${aiCourse.id}`);
  await expect(page.getByRole("heading", { name: aiCourse.title, exact: true })).toBeVisible();
  await expect(page.locator(".heading-badges")).toContainText("자료 기반 AI 코스");
  await expect(page.locator(".source-item a")).toHaveCount(aiCourse.sources.length);
  for (const source of aiCourse.sources) {
    await expect(page.locator(".source-item a").filter({ hasText: source.title })).toHaveAttribute("href", source.url);
  }
  const saved = await readStore(page);
  expect(saved.courses[0]).toMatchObject({ id: aiCourse.id, topic, level: "beginner", mode: "ai" });
  expect(saved.progress[aiCourse.id].currentLessonId).toBe(getLessons(aiCourse)[0].id);

  await page.reload();
  await expect(page.getByRole("heading", { name: aiCourse.title, exact: true })).toBeVisible();
  await expect(page.locator(".heading-badges")).toContainText("자료 기반 AI 코스");
  await expect(page.locator(".source-item a").filter({ hasText: aiCourse.sources[0].title })).toHaveAttribute("href", aiCourse.sources[0].url);
  expect((await readStore(page)).courses[0].mode).toBe("ai");
});

test("학습 카드를 순서대로 읽고 새로고침 후 같은 카드에서 이어간다", async ({ page }) => {
  await seedCourse(page);
  await page.goto(firstLessonPath);
  await expect(page.getByRole("heading", { name: "오늘 무엇을 배우나요?" })).toBeVisible();
  await expect(page.getByRole("button", { name: "이전 카드", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "다음 카드", exact: true }).click();
  await expect(page.getByRole("heading", { name: firstLesson.content[0].title, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: firstLesson.content[0].title, exact: true })).toBeVisible();
  expect((await readStore(page)).progress[demo.id].lessonSteps[firstLesson.id]).toBe(1);
  for (let index = 0; index < firstLesson.content.length + 1; index++) {
    await page.getByRole("button", { name: "다음 카드", exact: true }).click();
  }
  await expect(page.getByRole("heading", { name: "배운 내용을 확인할 시간", exact: true })).toBeVisible();
  await expect(page.locator(".content-card .source-item")).toHaveCount(firstLesson.sourceIds.length);
  await page.getByRole("link", { name: "퀴즈 시작하기", exact: true }).click();
  await expect(page).toHaveURL(firstQuizPath);
  await expect(page.locator(".quiz-option")).toHaveCount(4);
});

test("잠긴 레슨과 퀴즈는 직접 URL로 접근해도 열리지 않는다", async ({ page }) => {
  await seedCourse(page);
  const lockedPath = `/course/${demo.id}/lesson/${lessons[1].id}`;
  await page.goto(lockedPath);
  await expect(page.getByRole("heading", { name: "앞 레슨을 먼저 마쳐볼까요?", exact: true })).toBeVisible();
  await page.goto(`${lockedPath}/quiz`);
  await expect(page.getByRole("heading", { name: "앞 레슨을 먼저 마쳐볼까요?", exact: true })).toBeVisible();
  await expect(page.locator(".quiz-option")).toHaveCount(0);
  expect((await readStore(page)).progress[demo.id].currentLessonId).toBe(firstLesson.id);
});

test("실패 후 재도전으로 다음 레슨을 열고 복습에서 XP를 중복 지급하지 않는다", async ({ page }) => {
  await seedCourse(page);
  const correctAnswers = firstLesson.quiz.map((question) => question.correctAnswerIndex);
  const failedAnswers = [...correctAnswers];
  failedAnswers[2] = (failedAnswers[2] + 1) % 4;
  await page.goto(firstQuizPath);
  await answerQuiz(page, failedAnswers);
  await expect(page.getByRole("heading", { name: "조금만 더, 다시 도전해 볼까요?", exact: true })).toBeVisible();
  await expect(page.locator(".result-score")).toContainText("66.7%");
  await expect(page.locator(".xp-gain")).toContainText("+20 XP 획득");
  let state = (await readStore(page)).progress[demo.id];
  expect(state.totalXp).toBe(20);
  expect(state.completedLessonIds).toEqual([]);
  expect(state.quizResults[firstLesson.id].passed).toBe(false);

  await page.getByRole("button", { name: "다시 도전하기", exact: true }).click();
  await answerQuiz(page, correctAnswers);
  await expect(page.getByRole("heading", { name: "한 걸음 더 나아갔어요!", exact: true })).toBeVisible();
  await expect(page.locator(".xp-gain")).toContainText("+10 XP 획득");
  state = (await readStore(page)).progress[demo.id];
  expect(state.totalXp).toBe(30);
  expect(state.completedLessonIds).toEqual([firstLesson.id]);
  expect(state.currentLessonId).toBe(lessons[1].id);

  await page.getByRole("button", { name: "퀴즈 복습하기", exact: true }).click();
  await answerQuiz(page, correctAnswers);
  await expect(page.locator(".result-xp-note")).toContainText("추가 XP가 없어요");
  state = (await readStore(page)).progress[demo.id];
  expect(state.totalXp).toBe(30);
  expect(state.quizResults[firstLesson.id].attempts).toBe(3);
  await page.getByRole("link", { name: "다음 레슨으로", exact: true }).click();
  await expect(page.getByRole("heading", { name: lessons[1].title, exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: lessons[1].title, exact: true })).toBeVisible();
  await page.goto(`/course/${demo.id}`);
  await expect(page.locator(".lesson-row.complete")).toHaveCount(1);
  await expect(page.locator(".lesson-row.available")).toHaveCount(1);
  await expect(page.locator(".lesson-row.locked")).toHaveCount(7);
  await expect(page.locator(".xp-stat")).toContainText("30 XP");
});

test("없는 코스와 레슨은 복구할 수 있는 빈 상태를 보여준다", async ({ page }) => {
  await page.goto("/course/does-not-exist");
  await expect(page.getByRole("heading", { name: "저장된 코스를 찾을 수 없어요", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "홈으로 가기", exact: true })).toHaveAttribute("href", "/");
  await seedCourse(page);
  await page.goto(`/course/${demo.id}/lesson/does-not-exist`);
  await expect(page.getByRole("heading", { name: "이 레슨을 찾을 수 없어요", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "커리큘럼으로", exact: true })).toHaveAttribute("href", `/course/${demo.id}`);
});

for (const width of [320, 375, 414, 768]) {
  test(`${width}px 화면에서 커리큘럼·레슨·퀴즈가 가로로 넘치지 않는다`, async ({ page }) => {
    await page.setViewportSize({ width, height: 860 });
    await seedCourse(page);
    const screens = [
      { path: `/course/${demo.id}`, heading: demo.title },
      { path: firstLessonPath, heading: firstLesson.title },
      { path: firstQuizPath, heading: "배운 내용을 확인해 볼까요?" },
    ];
    for (const screen of screens) {
      await page.goto(screen.path);
      await expect(page.getByRole("heading", { name: screen.heading, exact: true })).toBeVisible();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth), {
        message: `${width}px에서 ${screen.path}에 가로 넘침이 없어야 합니다.`,
      }).toBeLessThanOrEqual(width + 1);
    }
  });
}
