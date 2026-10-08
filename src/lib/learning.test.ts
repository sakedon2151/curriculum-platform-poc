import assert from "node:assert/strict";
import test from "node:test";
import { createDemoCourse } from "./demo-course";
import { createProgress, getCourseCompletion, getLessons, getLessonStatus, getNextLesson, submitQuiz } from "./learning";
import { createEmptyStore, LEARNING_STORAGE_KEY, readLearningStore, writeLearningStore, type StorageLike } from "./storage";
import { courseSchema, sourceSchema } from "./types";

const course = createDemoCourse();
const lessons = getLessons(course);
const correctAnswers = (index: number) => lessons[index].quiz.map((question) => question.correctAnswerIndex);
const wrongAnswer = (answer: number) => (answer + 1) % 4;

test("the demo has 3 chapters, 9 distinct lessons and 27 valid questions with resolvable sources", () => {
  assert.equal(courseSchema.safeParse(course).success, true);
  assert.equal(course.chapters.length, 3);
  assert.equal(lessons.length, 9);
  assert.equal(new Set(lessons.map((lesson) => lesson.id)).size, 9);
  assert.equal(lessons.flatMap((lesson) => lesson.quiz).length, 27);
  assert.equal(getNextLesson(course, lessons[0].id)?.id, lessons[1].id);
  assert.equal(getNextLesson(course, "missing"), undefined);
});

test("locked direct routes cannot submit a quiz or skip prerequisites", () => {
  const progress = createProgress(course);
  assert.equal(getLessonStatus(course, progress, lessons[0].id), "available");
  assert.equal(getLessonStatus(course, progress, lessons[1].id), "locked");
  assert.throws(() => submitQuiz(course, progress, lessons[1].id, correctAnswers(1)), /이전 레슨/);
  assert.throws(() => submitQuiz(course, progress, lessons[0].id, [4, 0, 0]), /유효한 답변/);
  assert.throws(() => submitQuiz(course, progress, lessons[0].id, [0, 0]), /유효한 답변/);
});

test("two of three answers earns 20 XP but does not meet the 70% pass threshold", () => {
  const answers = correctAnswers(0);
  answers[2] = wrongAnswer(answers[2]);
  const attempt = submitQuiz(course, createProgress(course), lessons[0].id, answers);
  assert.equal(attempt.earnedXp, 20);
  assert.equal(attempt.progress.totalXp, 20);
  assert.equal(attempt.result.passed, false);
  assert.equal(attempt.progress.completedLessonIds.length, 0);
  assert.equal(getLessonStatus(course, attempt.progress, lessons[1].id), "locked");
  assert.ok(Math.abs(attempt.result.score - 66.66666666666666) < 0.001);
});

test("XP is credited per question once across retries and passing remains permanent", () => {
  const firstAnswers = correctAnswers(0);
  firstAnswers[2] = wrongAnswer(firstAnswers[2]);
  const first = submitQuiz(course, createProgress(course), lessons[0].id, firstAnswers);
  const secondAnswers = correctAnswers(0);
  secondAnswers[0] = wrongAnswer(secondAnswers[0]);
  const second = submitQuiz(course, first.progress, lessons[0].id, secondAnswers);
  assert.equal(second.earnedXp, 10);
  assert.equal(second.progress.totalXp, 30);
  assert.equal(second.result.passed, false);
  const passed = submitQuiz(course, second.progress, lessons[0].id, correctAnswers(0));
  assert.equal(passed.earnedXp, 0);
  assert.equal(passed.result.passed, true);
  assert.equal(passed.progress.currentLessonId, lessons[1].id);
  assert.equal(getLessonStatus(course, passed.progress, lessons[1].id), "available");
  const retry = submitQuiz(course, passed.progress, lessons[0].id, correctAnswers(0).map(wrongAnswer));
  assert.equal(retry.result.score, 0);
  assert.equal(retry.result.bestScore, 100);
  assert.equal(retry.result.passed, true);
  assert.equal(retry.result.attempts, 4);
  assert.equal(retry.progress.totalXp, 30);
  assert.deepEqual(retry.progress.completedLessonIds, [lessons[0].id]);
});

test("finishing all lessons reaches 100%, 270 XP and has no next lesson", () => {
  let progress = createProgress(course);
  for (let index = 0; index < lessons.length; index++) {
    progress = submitQuiz(course, progress, lessons[index].id, correctAnswers(index)).progress;
  }
  assert.equal(progress.totalXp, 270);
  assert.equal(progress.completedLessonIds.length, 9);
  assert.equal(getCourseCompletion(course, progress), 100);
  assert.equal(getNextLesson(course, lessons[8].id), undefined);
  assert.equal(progress.currentLessonId, lessons[8].id);
});

function memoryStorage(initial?: string): StorageLike & { value: () => string | undefined } {
  let value = initial;
  return {
    getItem: (key) => key === LEARNING_STORAGE_KEY ? value ?? null : null,
    setItem: (key, next) => { if (key === LEARNING_STORAGE_KEY) value = next; },
    value: () => value,
  };
}

test("course, step and quiz records survive a validated storage round trip", () => {
  const completed = submitQuiz(course, createProgress(course), lessons[0].id, correctAnswers(0)).progress;
  const progress = { ...completed, lessonSteps: { [lessons[1].id]: 2 } };
  const store = { ...createEmptyStore(), courses: [course], progress: { [course.id]: progress } };
  const storage = memoryStorage();
  assert.equal(writeLearningStore(store, storage), null);
  const loaded = readLearningStore(storage);
  assert.equal(loaded.error, null);
  assert.deepEqual(loaded.store, store);
});

test("invalid, stale and tampered storage is rejected without modifying the raw record", () => {
  for (const raw of ["not-json", JSON.stringify({ version: 0, courses: [], progress: {} })]) {
    const storage = memoryStorage(raw);
    const loaded = readLearningStore(storage);
    assert.ok(loaded.error);
    assert.deepEqual(loaded.store, createEmptyStore());
    assert.equal(storage.value(), raw);
  }
  const progress = createProgress(course);
  progress.totalXp = 10;
  const store = { ...createEmptyStore(), courses: [course], progress: { [course.id]: progress } };
  const storage = memoryStorage(JSON.stringify(store));
  assert.ok(readLearningStore(storage).error);
  assert.ok(writeLearningStore(store, storage));
});

test("storage access and quota errors are returned so learning can continue in memory", () => {
  const blocked: StorageLike = {
    getItem: () => { throw new Error("SecurityError"); },
    setItem: () => { throw new Error("QuotaExceededError"); },
  };
  assert.ok(readLearningStore(blocked).error);
  assert.match(writeLearningStore(createEmptyStore(), blocked) ?? "", /저장 공간/);
});

test("curricula with dangling references, duplicate questions or mismatched lesson IDs are rejected", () => {
  const dangling = structuredClone(course);
  dangling.chapters[0].lessons[0].sourceIds = ["missing-source"];
  assert.equal(courseSchema.safeParse(dangling).success, false);
  const duplicate = structuredClone(course);
  duplicate.chapters[0].lessons[1].quiz[0].question = duplicate.chapters[0].lessons[0].quiz[0].question;
  assert.equal(courseSchema.safeParse(duplicate).success, false);
  const mismatch = structuredClone(course);
  mismatch.chapters[0].lessons[0].quiz[0].lessonId = lessons[1].id;
  assert.equal(courseSchema.safeParse(mismatch).success, false);
});

test("sources reject script links and credential-bearing URLs", () => {
  const source = course.sources[0];
  assert.equal(sourceSchema.safeParse({ ...source, url: "javascript:alert(1)" }).success, false);
  assert.equal(sourceSchema.safeParse({ ...source, url: "https://name:secret@example.com/docs" }).success, false);
  assert.equal(sourceSchema.safeParse({ ...source, url: "https://docs.docker.com/" }).success, true);
});
