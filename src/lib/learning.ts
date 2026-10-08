import { learningProgressSchema, type Chapter, type Course, type LearningProgress, type Lesson, type QuizResult } from "./types";

export const QUIZ_PASS_PERCENTAGE = 70;
export const XP_PER_CORRECT_ANSWER = 10;

export function getLessons(course: Course): Lesson[] {
  return course.chapters.flatMap((chapter) => chapter.lessons);
}

export function getLessonsWithChapters(course: Course): { lesson: Lesson; chapter: Chapter }[] {
  return course.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => ({ chapter, lesson })));
}

export function getLesson(course: Course, lessonId: string): Lesson | undefined {
  return getLessons(course).find((lesson) => lesson.id === lessonId);
}

export function getNextLesson(course: Course, lessonId: string): Lesson | undefined {
  const lessons = getLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  return index < 0 ? undefined : lessons[index + 1];
}

export function getLessonStatus(course: Course, progress: LearningProgress | undefined, lessonId: string): "completed" | "available" | "locked" {
  const lessons = getLessons(course);
  const index = lessons.findIndex((lesson) => lesson.id === lessonId);
  if (index < 0) return "locked";
  const completed = progress?.courseId === course.id ? progress.completedLessonIds : [];
  if (completed.includes(lessonId)) return "completed";
  return index === 0 || lessons.slice(0, index).every((lesson) => completed.includes(lesson.id)) ? "available" : "locked";
}

export function isLessonUnlocked(course: Course, progress: LearningProgress | undefined, lessonId: string): boolean {
  return getLessonStatus(course, progress, lessonId) !== "locked";
}

export function getCourseCompletion(course: Course, progress: LearningProgress | undefined): number {
  if (progress?.courseId !== course.id) return 0;
  const lessons = getLessons(course);
  const completed = lessons.filter((lesson) => progress.completedLessonIds.includes(lesson.id)).length;
  return Math.round((completed / lessons.length) * 100);
}

export function createProgress(course: Course): LearningProgress {
  return {
    courseId: course.id,
    completedLessonIds: [],
    quizResults: {},
    totalXp: 0,
    currentLessonId: getLessons(course)[0].id,
    lessonSteps: {},
  };
}

export function requiredCorrectAnswers(questionCount: number): number {
  return Math.ceil(questionCount * QUIZ_PASS_PERCENTAGE / 100);
}

export function submitQuiz(course: Course, progress: LearningProgress, lessonId: string, answers: number[]): {
  progress: LearningProgress;
  result: QuizResult;
  earnedXp: number;
} {
  if (progress.courseId !== course.id) throw new Error("이 코스의 학습 기록이 아닙니다.");
  const lesson = getLesson(course, lessonId);
  if (!lesson) throw new Error("레슨을 찾을 수 없습니다.");
  if (!isLessonUnlocked(course, progress, lessonId)) throw new Error("이전 레슨을 완료한 후 퀴즈를 풀 수 있습니다.");
  if (answers.length !== lesson.quiz.length || answers.some((answer) => !Number.isInteger(answer) || answer < 0 || answer > 3)) {
    throw new Error("모든 문제에서 유효한 답변을 선택해 주세요.");
  }
  const previous = progress.quizResults[lessonId];
  const correctQuestions = lesson.quiz.filter((question, index) => question.correctAnswerIndex === answers[index]);
  const score = correctQuestions.length / lesson.quiz.length * 100;
  const creditedQuestionIds = new Set(previous?.creditedQuestionIds ?? []);
  let earnedXp = 0;
  for (const question of correctQuestions) {
    if (!creditedQuestionIds.has(question.id)) {
      creditedQuestionIds.add(question.id);
      earnedXp += XP_PER_CORRECT_ANSWER;
    }
  }
  const passed = (previous?.passed ?? false) || score >= QUIZ_PASS_PERCENTAGE;
  const result: QuizResult = {
    lessonId,
    answers: [...answers],
    score,
    bestScore: Math.max(previous?.bestScore ?? 0, score),
    correctCount: correctQuestions.length,
    totalQuestions: 3,
    passed,
    attempts: (previous?.attempts ?? 0) + 1,
    creditedQuestionIds: [...creditedQuestionIds],
    updatedAt: new Date().toISOString(),
  };
  const completedLessonIds = new Set(progress.completedLessonIds);
  if (passed) completedLessonIds.add(lessonId);
  const nextLesson = getNextLesson(course, lessonId);
  const updated = learningProgressSchema.parse({
    ...progress,
    completedLessonIds: getLessons(course).filter((entry) => completedLessonIds.has(entry.id)).map((entry) => entry.id),
    quizResults: { ...progress.quizResults, [lessonId]: result },
    totalXp: progress.totalXp + earnedXp,
    currentLessonId: passed && nextLesson ? nextLesson.id : lessonId,
  });
  return { progress: updated, result, earnedXp };
}
