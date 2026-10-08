import { z } from "zod";
import { courseSchema, learningProgressSchema, type Course, type LearningProgress } from "./types";
import { getLessons, isLessonUnlocked, XP_PER_CORRECT_ANSWER } from "./learning";

export const LEARNING_STORAGE_KEY = "moru-learning:v1";
export const LEARNING_STORAGE_VERSION = 1;

export const learningStoreSchema = z.object({
  version: z.literal(LEARNING_STORAGE_VERSION),
  courses: z.array(courseSchema).max(50),
  progress: z.record(z.string(), learningProgressSchema),
}).strict().superRefine((store, ctx) => {
  const coursesById = new Map(store.courses.map((course) => [course.id, course]));
  if (coursesById.size !== store.courses.length) ctx.addIssue({ code: "custom", message: "저장된 코스 ID가 중복되었습니다.", path: ["courses"] });
  for (const [courseId, progress] of Object.entries(store.progress)) {
    const path = ["progress", courseId];
    const course = coursesById.get(courseId);
    if (!course || progress.courseId !== courseId) {
      ctx.addIssue({ code: "custom", message: "코스와 학습 기록이 일치하지 않습니다.", path });
      continue;
    }
    const lessons = getLessons(course);
    const lessonsById = new Map(lessons.map((lesson) => [lesson.id, lesson]));
    const completed = new Set(progress.completedLessonIds);
    if (completed.size !== progress.completedLessonIds.length) ctx.addIssue({ code: "custom", message: "완료 레슨이 중복되었습니다.", path });
    progress.completedLessonIds.forEach((lessonId) => {
      const index = lessons.findIndex((lesson) => lesson.id === lessonId);
      if (index < 0 || !progress.quizResults[lessonId]?.passed || lessons.slice(0, index).some((lesson) => !completed.has(lesson.id))) {
        ctx.addIssue({ code: "custom", message: "레슨 완료 순서가 올바르지 않습니다.", path });
      }
    });
    let totalCredited = 0;
    for (const [lessonId, result] of Object.entries(progress.quizResults)) {
      const lesson = lessonsById.get(lessonId);
      if (!lesson || result.lessonId !== lessonId) {
        ctx.addIssue({ code: "custom", message: "퀴즈 결과의 레슨이 일치하지 않습니다.", path });
        continue;
      }
      const credited = new Set(result.creditedQuestionIds);
      const correctCount = lesson.quiz.filter((question, index) => question.correctAnswerIndex === result.answers[index]).length;
      const score = correctCount / lesson.quiz.length * 100;
      if (credited.size !== result.creditedQuestionIds.length || result.creditedQuestionIds.some((questionId) => !lesson.quiz.some((question) => question.id === questionId))) {
        ctx.addIssue({ code: "custom", message: "XP 문제 기록이 올바르지 않습니다.", path });
      }
      const possibleScores = [0, 100 / 3, 200 / 3, 100];
      if (result.correctCount !== correctCount || Math.abs(result.score - score) > 0.001 || result.bestScore < result.score || !possibleScores.some((possible) => Math.abs(possible - result.bestScore) < 0.001) || result.bestScore > credited.size / 3 * 100 + 0.001 || result.passed !== (result.bestScore >= 70) || result.passed !== completed.has(lessonId)) {
        ctx.addIssue({ code: "custom", message: "퀴즈 점수와 완료 기록이 일치하지 않습니다.", path });
      }
      if (lesson.quiz.some((question, index) => question.correctAnswerIndex === result.answers[index] && !credited.has(question.id))) {
        ctx.addIssue({ code: "custom", message: "정답의 XP 기록이 없습니다.", path });
      }
      totalCredited += credited.size;
    }
    if (progress.totalXp !== totalCredited * XP_PER_CORRECT_ANSWER) ctx.addIssue({ code: "custom", message: "누적 XP가 퀴즈 기록과 일치하지 않습니다.", path });
    if (!lessonsById.has(progress.currentLessonId) || !isLessonUnlocked(course, progress, progress.currentLessonId)) ctx.addIssue({ code: "custom", message: "현재 레슨이 유효하지 않습니다.", path });
    if (Object.keys(progress.lessonSteps).some((lessonId) => !lessonsById.has(lessonId))) ctx.addIssue({ code: "custom", message: "학습 단계의 레슨이 유효하지 않습니다.", path });
  }
});

export type LearningStore = z.infer<typeof learningStoreSchema>;
export type StorageLike = Pick<Storage, "getItem" | "setItem">;

export function createEmptyStore(): LearningStore {
  return { version: LEARNING_STORAGE_VERSION, courses: [], progress: {} };
}

function resolveStorage(storage?: StorageLike | null): StorageLike | null {
  if (storage !== undefined) return storage;
  return typeof window === "undefined" ? null : window.localStorage;
}

export function readLearningStore(storage?: StorageLike | null): { store: LearningStore; error: string | null } {
  try {
    const target = resolveStorage(storage);
    if (!target) return { store: createEmptyStore(), error: null };
    const raw = target.getItem(LEARNING_STORAGE_KEY);
    if (!raw) return { store: createEmptyStore(), error: null };
    return { store: learningStoreSchema.parse(JSON.parse(raw)), error: null };
  } catch {
    return {
      store: createEmptyStore(),
      error: "저장된 학습 기록을 읽을 수 없습니다. 브라우저 저장 권한 또는 데이터 형식을 확인해 주세요.",
    };
  }
}

export function writeLearningStore(store: { version: 1; courses: Course[]; progress: Record<string, LearningProgress> }, storage?: StorageLike | null): string | null {
  try {
    const target = resolveStorage(storage);
    if (!target) return "이 브라우저에서 학습 기록을 저장할 수 없습니다.";
    const validated = learningStoreSchema.parse(store);
    target.setItem(LEARNING_STORAGE_KEY, JSON.stringify(validated));
    return null;
  } catch (error) {
    if (error instanceof z.ZodError) return "학습 기록의 형식이 올바르지 않아 저장하지 못했습니다.";
    return "브라우저 저장 공간이 부족하거나 저장 권한이 없습니다. 현재 페이지에서는 학습을 계속할 수 있습니다.";
  }
}
