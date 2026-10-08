"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, Clock3, Lightbulb, ListChecks, Sparkles } from "lucide-react";
import { LearningEmpty, LearningLoading } from "@/components/course-view";
import { useLearning } from "@/components/learning-provider";
import { SourceList } from "@/components/source-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getCourseCompletion, getLessonsWithChapters, isLessonUnlocked } from "@/lib/learning";
import type { Chapter, Course, LearningProgress, Lesson } from "@/lib/types";

const levelLabels = { intro: "입문", beginner: "초급", intermediate: "중급" };

export function LessonView({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { courses, progress, ready } = useLearning();
  const course = courses.find((item) => item.id === courseId);
  if (!ready) return <LearningLoading />;
  if (!course) return <LearningEmpty />;
  const entry = getLessonsWithChapters(course).find(({ lesson }) => lesson.id === lessonId);
  if (!entry) return <LearningEmpty courseId={courseId} lessonMissing />;
  if (!isLessonUnlocked(course, progress[courseId], lessonId)) return <LearningEmpty courseId={courseId} locked />;

  return <LessonReader key={`${courseId}-${lessonId}`} course={course} chapter={entry.chapter} lesson={entry.lesson} courseProgress={progress[courseId]} />;
}

function LessonReader({ course, chapter, lesson, courseProgress }: { course: Course; chapter: Chapter; lesson: Lesson; courseProgress?: LearningProgress }) {
  const { setCurrentLesson, setLessonStep, storageError } = useLearning();
  const examplesStep = lesson.content.length + 1;
  const finalStep = examplesStep + 1;
  const totalSteps = finalStep + 1;
  const [step, setStep] = useState(() => Math.min(courseProgress?.lessonSteps[lesson.id] ?? 0, finalStep));
  const headingRef = useRef<HTMLHeadingElement>(null);
  const sources = course.sources.filter((source) => lesson.sourceIds.includes(source.id));
  const isComplete = courseProgress?.completedLessonIds.includes(lesson.id) ?? false;
  const completion = getCourseCompletion(course, courseProgress);

  useEffect(() => {
    setCurrentLesson(course.id, lesson.id);
  }, [course.id, lesson.id, setCurrentLesson]);

  function moveTo(nextStep: number) {
    if (nextStep < 0 || nextStep > finalStep) return;
    setStep(nextStep);
    setLessonStep(course.id, lesson.id, nextStep);
    requestAnimationFrame(() => headingRef.current?.focus());
  }

  const stepTitle = step === 0 ? "오늘 무엇을 배우나요?"
    : step === examplesStep ? "예시로 연결해 보기"
    : step === finalStep ? "배운 내용을 확인할 시간"
    : lesson.content[step - 1].title;

  return (
    <div className="learning-page lesson-page">
      <Link className="back-link" href={`/course/${course.id}`}><ArrowLeft size={16} aria-hidden="true" /> 커리큘럼으로</Link>
      <div className="page-heading">
        <div className="eyebrow">챕터 {chapter.order} <span aria-hidden="true">/</span> 레슨 {lesson.order}</div>
        <h1>{lesson.title}</h1>
        <div className="heading-badges"><Badge variant="outline"><Clock3 size={13} aria-hidden="true" /> {lesson.estimatedMinutes}분</Badge><Badge variant="secondary">{levelLabels[lesson.difficulty]}</Badge>{isComplete ? <Badge><Check size={13} aria-hidden="true" /> 완료한 레슨 · 복습 중</Badge> : null}</div>
      </div>

      <div className="course-layout">
        <div className="course-main">
          <div className="lesson-progress">
            <div className="chapter-head"><span className="muted">작은 카드 하나씩, 나의 속도로</span><strong>{step + 1} / {totalSteps}</strong></div>
            <Progress value={(step + 1) / totalSteps * 100} aria-label={`학습 카드 ${totalSteps}개 중 ${step + 1}번째`} />
            <ol className="step-dots" aria-label="학습 단계">{Array.from({ length: totalSteps }, (_, index) => <li key={index} className={index < step ? "done" : index === step ? "active" : ""} aria-current={index === step ? "step" : undefined}><span className="sr-only">{index + 1}번째 카드{index < step ? ", 읽음" : index === step ? ", 현재 카드" : ""}</span></li>)}</ol>
          </div>

          <article className="panel content-card" key={step}>
            <div className="content-card-label"><span className="icon-box">{step === 0 ? <ListChecks size={21} aria-hidden="true" /> : step === finalStep ? <Sparkles size={21} aria-hidden="true" /> : <Lightbulb size={21} aria-hidden="true" />}</span><span className="eyebrow">{step === 0 ? "학습 목표" : step === examplesStep ? "실용적인 예시" : step === finalStep ? "정리 & 확인" : "핵심 이해"}</span></div>
            <h2 ref={headingRef} tabIndex={-1}>{stepTitle}</h2>
            {step === 0 ? (
              <><p className="muted">이 레슨을 마치면 다음 내용을 설명할 수 있어요.</p><ul className="objectives-list">{lesson.objectives.map((objective, index) => <li key={`${lesson.id}-objective-${index}`}><Check size={17} aria-hidden="true" /><span>{objective}</span></li>)}</ul><div className="divider" /><h3>기억할 핵심 개념</h3><div className="concepts">{lesson.keyConcepts.map((concept, index) => <Badge variant="secondary" key={`${lesson.id}-concept-${index}`}>{concept}</Badge>)}</div></>
            ) : step === examplesStep ? (
              <div className="lesson-examples">{lesson.examples.map((example, index) => <section className="example-block" key={`${lesson.id}-example-${index}`}><h3>{example.title}</h3><TextParagraphs text={example.explanation} />{example.code ? <pre><code>{example.code}</code></pre> : null}</section>)}</div>
            ) : step === finalStep ? (
              <><p>핵심 개념을 떠올리면서 세 가지 질문을 풀어볼까요?</p><div className="concepts">{lesson.keyConcepts.map((concept, index) => <Badge variant="secondary" key={`${lesson.id}-concept-${index}`}>{concept}</Badge>)}</div><div className="quiz-rule"><ListChecks size={20} aria-hidden="true" /><div><strong>3문제 모두 맞히면 다음 레슨이 열려요.</strong><p className="muted">통과 기준은 70%예요. 3문제 중 2문제는 66.7%이므로, 3문제를 모두 맞혀야 해요. 틀려도 다시 도전할 수 있어요.</p></div></div><div className="divider" /><h3>이 레슨의 참고 자료</h3><SourceList sources={sources} /></>
            ) : <div className="lesson-content"><TextParagraphs text={lesson.content[step - 1].body} /></div>}
          </article>

          <div className="lesson-actions">
            <Button variant="outline" onClick={() => moveTo(step - 1)} disabled={step === 0}><ArrowLeft size={16} aria-hidden="true" /> 이전 카드</Button>
            {step < finalStep ? <Button onClick={() => moveTo(step + 1)}>다음 카드<ArrowRight size={16} aria-hidden="true" /></Button> : <Link className="button primary" href={`/course/${course.id}/lesson/${lesson.id}/quiz`}>{isComplete ? "퀴즈로 복습하기" : "퀴즈 시작하기"}<ArrowRight size={16} aria-hidden="true" /></Link>}
          </div>
          <p className="muted lesson-save-note">{storageError ? "현재 기록은 이 페이지에 유지돼요. 브라우저 저장 상태를 확인해 주세요." : "읽던 카드와 학습 기록은 이 브라우저에 자동으로 저장돼요."}</p>
        </div>

        <aside className="course-aside">
          <section className="panel lesson-context"><span className="eyebrow">지금 배우는 챕터</span><h2>{chapter.title}</h2><p className="muted">{chapter.description}</p><div className="divider" /><div className="chapter-head"><span>전체 코스 진행률</span><strong>{completion}%</strong></div><Progress value={completion} aria-label={`코스 진행률 ${completion}%`} /><p className="muted">{courseProgress?.completedLessonIds.length ?? 0} / {course.chapters.flatMap((item) => item.lessons).length}개 레슨 완료</p></section>
          <section className="panel learning-tip"><div className="icon-box"><Lightbulb size={21} aria-hidden="true" /></div><h3>천천히 이해해도 괜찮아요</h3><p className="muted">예시를 직접 떠올려 보고, 낯선 개념이 있다면 이전 카드로 돌아가 보세요. 퀴즈의 해설도 학습의 일부예요.</p></section>
        </aside>
      </div>
    </div>
  );
}

function TextParagraphs({ text }: { text: string }) {
  return <>{text.split(/\n\s*\n/).map((paragraph, index) => <p className="text-paragraph" key={index}>{paragraph}</p>)}</>;
}
