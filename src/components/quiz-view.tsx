"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, CircleCheck, Lightbulb, RotateCcw, Sparkles, Trophy, X } from "lucide-react";
import { LearningEmpty, LearningLoading } from "@/components/course-view";
import { useLearning } from "@/components/learning-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { getLesson, getNextLesson, isLessonUnlocked, QUIZ_PASS_PERCENTAGE, requiredCorrectAnswers, XP_PER_CORRECT_ANSWER } from "@/lib/learning";
import type { Course, LearningProgress, Lesson, QuizResult } from "@/lib/types";

export function QuizView({ courseId, lessonId }: { courseId: string; lessonId: string }) {
  const { courses, progress, ready } = useLearning();
  const course = courses.find((item) => item.id === courseId);
  if (!ready) return <LearningLoading />;
  if (!course) return <LearningEmpty />;
  const lesson = getLesson(course, lessonId);
  if (!lesson) return <LearningEmpty courseId={courseId} lessonMissing />;
  if (!isLessonUnlocked(course, progress[courseId], lessonId)) return <LearningEmpty courseId={courseId} locked />;

  return <QuizRunner key={`${courseId}-${lessonId}`} course={course} lesson={lesson} courseProgress={progress[courseId]} />;
}

function QuizRunner({ course, lesson, courseProgress }: { course: Course; lesson: Lesson; courseProgress?: LearningProgress }) {
  const { completeQuiz, setCurrentLesson, storageError } = useLearning();
  const [questionIndex, setQuestionIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answers, setAnswers] = useState<number[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [earnedXp, setEarnedXp] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [baselineCredits, setBaselineCredits] = useState(() => courseProgress?.quizResults[lesson.id]?.creditedQuestionIds ?? []);
  const submissionRef = useRef(false);
  const questionHeadingRef = useRef<HTMLHeadingElement>(null);
  const resultHeadingRef = useRef<HTMLHeadingElement>(null);
  const question = lesson.quiz[questionIndex];
  const isCorrect = selected === question.correctAnswerIndex;
  const isNewCredit = !baselineCredits.includes(question.id);
  const nextLesson = getNextLesson(course, lesson.id);
  const requiredCorrect = requiredCorrectAnswers(lesson.quiz.length);
  const previousAttempts = courseProgress?.quizResults[lesson.id]?.attempts ?? 0;
  const answeredCount = questionIndex + (revealed ? 1 : 0);

  useEffect(() => {
    setCurrentLesson(course.id, lesson.id);
  }, [course.id, lesson.id, setCurrentLesson]);

  function submitAnswer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (revealed) {
      moveNext();
      return;
    }
    if (selected === null || answers.length !== questionIndex) return;
    setAnswers((current) => [...current, selected]);
    setRevealed(true);
  }

  function moveNext() {
    if (!revealed) return;
    if (questionIndex < lesson.quiz.length - 1) {
      setQuestionIndex((current) => current + 1);
      setSelected(null);
      setRevealed(false);
      requestAnimationFrame(() => questionHeadingRef.current?.focus());
      return;
    }
    if (submissionRef.current) return;
    submissionRef.current = true;
    try {
      const savedResult = completeQuiz(course.id, lesson.id, answers);
      if (!savedResult) {
        setError("결과를 기록하지 못했어요. 다시 한 번 완료 버튼을 눌러 주세요.");
        submissionRef.current = false;
        return;
      }
      const alreadyCredited = courseProgress?.quizResults[lesson.id]?.creditedQuestionIds ?? [];
      setEarnedXp(savedResult.creditedQuestionIds.filter((id) => !alreadyCredited.includes(id)).length * XP_PER_CORRECT_ANSWER);
      setResult(savedResult);
      setError(null);
      requestAnimationFrame(() => resultHeadingRef.current?.focus());
    } catch {
      setError("결과를 기록하지 못했어요. 다시 한 번 완료 버튼을 눌러 주세요.");
      submissionRef.current = false;
    }
  }

  function retry() {
    setBaselineCredits(result?.creditedQuestionIds ?? baselineCredits);
    setQuestionIndex(0);
    setSelected(null);
    setAnswers([]);
    setRevealed(false);
    setResult(null);
    setEarnedXp(0);
    setError(null);
    submissionRef.current = false;
    setCurrentLesson(course.id, lesson.id);
    requestAnimationFrame(() => questionHeadingRef.current?.focus());
  }

  if (result) {
    const passedThisAttempt = result.score >= QUIZ_PASS_PERCENTAGE;
    return (
      <div className="learning-page quiz-page">
        <Link className="back-link" href={`/course/${course.id}`}><ArrowLeft size={16} aria-hidden="true" /> 커리큘럼으로</Link>
        <section className={`panel quiz-result ${passedThisAttempt ? "passed" : "retry"}`} aria-labelledby="quiz-result-title">
          <div className="result-icon">{passedThisAttempt ? <Trophy size={42} aria-hidden="true" /> : <Lightbulb size={42} aria-hidden="true" />}</div>
          <span className="eyebrow">{passedThisAttempt ? "레슨 완료" : "다시 도전"}</span>
          <h1 id="quiz-result-title" ref={resultHeadingRef} tabIndex={-1}>{passedThisAttempt ? "한 걸음 더 나아갔어요!" : "조금만 더, 다시 도전해 볼까요?"}</h1>
          <p className="muted">{lesson.title}</p>
          <div className="result-score"><strong>{result.correctCount}<span> / {result.totalQuestions}</span></strong><span>{result.score === 100 ? "100" : result.score.toFixed(1)}% 정답</span></div>
          {earnedXp > 0 ? <div className="xp-gain"><Sparkles size={20} aria-hidden="true" /> +{earnedXp} XP 획득</div> : <p className="muted result-xp-note">이번 도전에서는 추가 XP가 없어요. 이미 맞혔던 문제의 XP는 다시 쌓이지 않아요.</p>}
          <p className="result-description">{passedThisAttempt ? nextLesson ? `다음 레슨 ‘${nextLesson.title}’이 열렸어요.` : "모든 레슨을 마쳤어요. 언제든 다시 읽고 복습할 수 있어요." : `${requiredCorrect}문제를 모두 맞히면 통과해요. 해설을 떠올리며 한 번 더 풀어보세요.`}</p>
          {!passedThisAttempt && result.passed ? <p className="muted">이미 완료한 레슨이에요. 이번 복습 점수와 관계없이 다음 레슨은 계속 열려 있어요.</p> : null}
          <div className="result-actions">
            {passedThisAttempt ? nextLesson ? <Link className="button primary" href={`/course/${course.id}/lesson/${nextLesson.id}`}>다음 레슨으로<ArrowRight size={16} aria-hidden="true" /></Link> : <Link className="button primary" href={`/course/${course.id}`}>완주한 커리큘럼 보기<Check size={16} aria-hidden="true" /></Link> : <Button onClick={retry}><RotateCcw size={16} aria-hidden="true" /> 다시 도전하기</Button>}
            <Link className="button secondary" href={`/course/${course.id}/lesson/${lesson.id}`}>레슨 다시 읽기</Link>
            {passedThisAttempt ? <Button variant="ghost" onClick={retry}>퀴즈 복습하기</Button> : null}
          </div>
          <p className="muted result-save-note">{result.attempts}번째 도전 · 누적 {(courseProgress?.totalXp ?? 0)} XP · {storageError ? "현재 페이지에 결과가 기록됐어요. 브라우저 저장 상태를 확인해 주세요." : "결과가 자동 저장됐어요."}</p>
        </section>
      </div>
    );
  }

  return (
    <div className="learning-page quiz-page">
      <Link className="back-link" href={`/course/${course.id}/lesson/${lesson.id}`}><ArrowLeft size={16} aria-hidden="true" /> 레슨으로 돌아가기</Link>
      <div className="page-heading quiz-page-heading"><span className="eyebrow">이해도 확인</span><h1>배운 내용을 확인해 볼까요?</h1><p className="page-intro">{lesson.title}</p></div>
      <div className="quiz-shell">
        <div className="quiz-progress"><div className="chapter-head"><strong>문제 {questionIndex + 1} / {lesson.quiz.length}</strong><Badge variant="outline">{previousAttempts > 0 ? `${previousAttempts + 1}번째 도전` : "첫 번째 도전"}</Badge></div><Progress value={answeredCount / lesson.quiz.length * 100} aria-label={`총 ${lesson.quiz.length}문제 중 ${answeredCount}문제 확인 완료`} /></div>
        <form onSubmit={submitAnswer}>
          <section className="panel quiz-card" aria-labelledby="quiz-question-title">
            <span className="eyebrow">문제 {String(questionIndex + 1).padStart(2, "0")}</span>
            <h2 id="quiz-question-title" ref={questionHeadingRef} tabIndex={-1}>{question.question}</h2>
            <div className="quiz-options" role="group" aria-label="정답 선택">
              {question.options.map((option, optionIndex) => {
                const optionCorrect = revealed && optionIndex === question.correctAnswerIndex;
                const optionIncorrect = revealed && selected === optionIndex && !optionCorrect;
                return <button key={`${question.id}-${optionIndex}`} type="button" disabled={revealed} aria-pressed={selected === optionIndex} onClick={() => setSelected(optionIndex)} className={`quiz-option${selected === optionIndex ? " selected" : ""}${optionCorrect ? " correct" : ""}${optionIncorrect ? " incorrect" : ""}`}><span className="option-letter">{String.fromCharCode(65 + optionIndex)}</span><span className="option-text">{option}</span>{optionCorrect ? <Check size={20} aria-hidden="true" /> : optionIncorrect ? <X size={20} aria-hidden="true" /> : null}<span className="sr-only">{optionCorrect ? ", 정답" : optionIncorrect ? ", 선택한 오답" : ""}</span></button>;
              })}
            </div>
          </section>

          {revealed ? <div className={`quiz-feedback ${isCorrect ? "correct" : "incorrect"}`} role="status"><div className="feedback-heading">{isCorrect ? <CircleCheck size={24} aria-hidden="true" /> : <Lightbulb size={24} aria-hidden="true" />}<h3>{isCorrect ? "정확히 이해했어요!" : "이 해설을 함께 살펴봐요"}</h3>{isCorrect && isNewCredit ? <span className="xp-gain">+10 XP 예정</span> : null}</div>{!isCorrect ? <p className="feedback-answer"><strong>정답:</strong> {question.options[question.correctAnswerIndex]}</p> : null}<p className="text-paragraph">{question.explanation}</p>{isCorrect && !isNewCredit ? <p className="muted">전에 맞혔던 문제예요. 이해를 한 번 더 확인했어요.</p> : null}</div> : null}
          {error ? <p className="notice error" role="alert">{error}</p> : null}
          <div className="quiz-actions"><span className="muted">{revealed ? questionIndex === lesson.quiz.length - 1 ? "퀴즈를 마치면 결과와 XP가 저장돼요." : "해설을 읽고 다음 질문으로 가볼까요?" : "가장 알맞은 답 하나를 골라 주세요."}</span><Button type="submit" disabled={selected === null}>{revealed ? questionIndex === lesson.quiz.length - 1 ? "퀴즈 완료하기" : "다음 문제" : "정답 확인"}<ArrowRight size={16} aria-hidden="true" /></Button></div>
        </form>
        <p className="muted quiz-rule-note">통과 기준 {QUIZ_PASS_PERCENTAGE}% · 이번 퀴즈는 {requiredCorrect} / {lesson.quiz.length}문제 정답이 필요해요. 문제별 XP는 최초 정답에 한 번만 쌓여요.</p>
      </div>
    </div>
  );
}
