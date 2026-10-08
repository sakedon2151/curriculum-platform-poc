import { z } from "zod";

export const levelSchema = z.enum(["intro", "beginner", "intermediate"]);
export type Level = z.infer<typeof levelSchema>;

const text = z.string().trim().min(1).max(8_000);
const title = z.string().trim().min(1).max(200);
const id = z.string().min(1).max(160).regex(/^[a-zA-Z0-9_-]+$/);
const stringList = z.array(title).min(1).max(8);

export const sourceSchema = z.object({
  id,
  title,
  url: z.string().trim().url().max(2_048).refine((value) => {
    try {
      const url = new URL(value);
      return ["https:", "http:"].includes(url.protocol) && !url.username && !url.password;
    } catch {
      return false;
    }
  }, "출처는 인증 정보가 없는 HTTP 또는 HTTPS 주소여야 합니다."),
  summary: text,
}).strict();
export type Source = z.infer<typeof sourceSchema>;

const contentSchema = z.array(z.object({ title, body: text }).strict()).min(2).max(8);
const examplesSchema = z.array(z.object({
  title,
  explanation: text,
  code: z.string().min(1).max(8_000).optional(),
}).strict()).min(1).max(4);

const quizFields = {
  question: text,
  options: z.array(title).length(4),
  correctAnswerIndex: z.number().int().min(0).max(3),
  explanation: text,
};

export const quizQuestionSchema = z.object({ id, lessonId: id, ...quizFields }).strict();
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

const lessonFields = {
  title,
  objectives: stringList,
  difficulty: levelSchema,
  estimatedMinutes: z.number().int().min(1).max(60),
  keyConcepts: stringList,
  content: contentSchema,
  examples: examplesSchema,
  sourceIds: z.array(id).min(1).max(10),
};

export const lessonSchema = z.object({
  id,
  ...lessonFields,
  quiz: z.array(quizQuestionSchema).length(3),
  order: z.number().int().min(1).max(3),
}).strict();
export type Lesson = z.infer<typeof lessonSchema>;

export const chapterSchema = z.object({
  id,
  title,
  description: text,
  objectives: stringList,
  order: z.number().int().min(1).max(3),
  lessons: z.array(lessonSchema).length(3),
}).strict();
export type Chapter = z.infer<typeof chapterSchema>;

const normalize = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");

const fullCourseSchema = z.object({
  id,
  title,
  description: text,
  topic: z.string().trim().min(2).max(200),
  level: levelSchema,
  chapters: z.array(chapterSchema).length(3),
  sources: z.array(sourceSchema).min(1).max(10),
  createdAt: z.string().datetime(),
  mode: z.enum(["demo", "ai"]),
}).strict();

export const courseSchema = fullCourseSchema.superRefine((course, ctx) => {
  const ids = new Set<string>();
  const checkId = (value: string, path: (string | number)[]) => {
    if (ids.has(value)) ctx.addIssue({ code: "custom", message: "ID가 중복되었습니다.", path });
    ids.add(value);
  };
  checkId(course.id, ["id"]);
  const sourceIds = new Set(course.sources.map((source) => source.id));
  const sourceUrls = new Set<string>();
  course.sources.forEach((source, index) => {
    checkId(source.id, ["sources", index, "id"]);
    try {
      const canonical = new URL(source.url);
      canonical.hash = "";
      const value = canonical.href.replace(/\/$/, "");
      if (sourceUrls.has(value)) ctx.addIssue({ code: "custom", message: "출처 URL이 중복되었습니다.", path: ["sources", index, "url"] });
      sourceUrls.add(value);
    } catch {
      // The source schema reports malformed URLs; semantic validation must not throw.
    }
  });
  const chapterTitles = new Set<string>();
  const lessonTitles = new Set<string>();
  const questionTexts = new Set<string>();
  course.chapters.forEach((chapter, chapterIndex) => {
    const chapterPath = ["chapters", chapterIndex];
    checkId(chapter.id, [...chapterPath, "id"]);
    if (chapter.order !== chapterIndex + 1) ctx.addIssue({ code: "custom", message: "챕터 순서는 1부터 연속이어야 합니다.", path: [...chapterPath, "order"] });
    const chapterTitle = normalize(chapter.title);
    if (chapterTitles.has(chapterTitle)) ctx.addIssue({ code: "custom", message: "챕터 제목이 중복되었습니다.", path: [...chapterPath, "title"] });
    chapterTitles.add(chapterTitle);
    chapter.lessons.forEach((lesson, lessonIndex) => {
      const lessonPath = [...chapterPath, "lessons", lessonIndex];
      checkId(lesson.id, [...lessonPath, "id"]);
      if (lesson.order !== lessonIndex + 1) ctx.addIssue({ code: "custom", message: "레슨 순서는 1부터 연속이어야 합니다.", path: [...lessonPath, "order"] });
      const lessonTitle = normalize(lesson.title);
      if (lessonTitles.has(lessonTitle)) ctx.addIssue({ code: "custom", message: "레슨 제목이 중복되었습니다.", path: [...lessonPath, "title"] });
      lessonTitles.add(lessonTitle);
      if (new Set(lesson.sourceIds).size !== lesson.sourceIds.length) ctx.addIssue({ code: "custom", message: "레슨 출처가 중복되었습니다.", path: [...lessonPath, "sourceIds"] });
      lesson.sourceIds.forEach((sourceId, index) => {
        if (!sourceIds.has(sourceId)) ctx.addIssue({ code: "custom", message: "존재하지 않는 출처입니다.", path: [...lessonPath, "sourceIds", index] });
      });
      lesson.quiz.forEach((question, questionIndex) => {
        const questionPath = [...lessonPath, "quiz", questionIndex];
        checkId(question.id, [...questionPath, "id"]);
        if (question.lessonId !== lesson.id) ctx.addIssue({ code: "custom", message: "퀴즈의 레슨 ID가 일치하지 않습니다.", path: [...questionPath, "lessonId"] });
        const questionText = normalize(question.question);
        if (questionTexts.has(questionText)) ctx.addIssue({ code: "custom", message: "퀴즈 질문이 중복되었습니다.", path: [...questionPath, "question"] });
        questionTexts.add(questionText);
        if (new Set(question.options.map(normalize)).size !== 4) ctx.addIssue({ code: "custom", message: "퀴즈 선택지는 서로 달라야 합니다.", path: [...questionPath, "options"] });
      });
    });
  });
});
export type Course = z.infer<typeof courseSchema>;

// Keep the provider schema plain: every AI field is required, including nullable code.
// Semantic checks run after trusted server code assigns identifiers and metadata.
export const curriculumDraftSchema = z.object({
  title,
  description: text,
  chapters: z.array(z.object({
    title,
    description: text,
    objectives: stringList,
    lessons: z.array(z.object({
      ...lessonFields,
      examples: z.array(z.object({
        title,
        explanation: text,
        code: z.string().min(1).max(8_000).nullable(),
      }).strict()).min(1).max(4),
      quiz: z.array(z.object(quizFields).strict()).length(3),
    }).strict()).length(3),
  }).strict()).length(3),
}).strict();
export type CurriculumDraft = z.infer<typeof curriculumDraftSchema>;

export function materializeCourse(draft: CurriculumDraft, metadata: {
  id?: string;
  topic: string;
  level: Level;
  sources: Source[];
  mode: "demo" | "ai";
  createdAt?: string;
}): Course {
  const parsed = curriculumDraftSchema.parse(draft);
  const courseId = metadata.id ?? `course-${crypto.randomUUID()}`;
  return courseSchema.parse({
    ...parsed,
    ...metadata,
    id: courseId,
    createdAt: metadata.createdAt ?? new Date().toISOString(),
    chapters: parsed.chapters.map((chapter, chapterIndex) => ({
      ...chapter,
      id: `${courseId}-chapter-${chapterIndex + 1}`,
      order: chapterIndex + 1,
      lessons: chapter.lessons.map((lesson, lessonIndex) => {
        const lessonId = `${courseId}-lesson-${chapterIndex * 3 + lessonIndex + 1}`;
        return {
          ...lesson,
          id: lessonId,
          order: lessonIndex + 1,
          examples: lesson.examples.map(({ code, ...example }) => code === null ? example : { ...example, code }),
          quiz: lesson.quiz.map((question, questionIndex) => ({ ...question, id: `${lessonId}-question-${questionIndex + 1}`, lessonId })),
        };
      }),
    })),
  });
}

export const quizResultSchema = z.object({
  lessonId: id,
  answers: z.array(z.number().int().min(0).max(3)).length(3),
  score: z.number().min(0).max(100),
  bestScore: z.number().min(0).max(100),
  correctCount: z.number().int().min(0).max(3),
  totalQuestions: z.literal(3),
  passed: z.boolean(),
  attempts: z.number().int().min(1),
  creditedQuestionIds: z.array(id).max(3),
  updatedAt: z.string().datetime(),
}).strict();
export type QuizResult = z.infer<typeof quizResultSchema>;

export const learningProgressSchema = z.object({
  courseId: id,
  completedLessonIds: z.array(id).max(9),
  quizResults: z.record(id, quizResultSchema),
  totalXp: z.number().int().min(0).max(270),
  currentLessonId: id,
  lessonSteps: z.record(id, z.number().int().min(0).max(20)),
}).strict();
export type LearningProgress = z.infer<typeof learningProgressSchema>;
