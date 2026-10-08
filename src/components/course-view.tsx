"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight, BookOpen, Check, Clock3, LockKeyhole, Play, Sparkles } from "lucide-react";
import { useLearning } from "@/components/learning-provider";
import { SourceList } from "@/components/source-list";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { getCourseCompletion, getLessons, getLessonStatus } from "@/lib/learning";

const levelLabels = { intro: "입문", beginner: "초급", intermediate: "중급" };

export function CourseView({ courseId }: { courseId: string }) {
  const { courses, progress, ready } = useLearning();
  const course = courses.find((item) => item.id === courseId);

  if (!ready) return <LearningLoading />;
  if (!course) return <LearningEmpty />;

  const courseProgress = progress[course.id];
  const lessons = getLessons(course);
  const completion = getCourseCompletion(course, courseProgress);
  const completedCount = courseProgress?.completedLessonIds.length ?? 0;
  const availableLesson = lessons.find((lesson) => getLessonStatus(course, courseProgress, lesson.id) === "available");
  const currentLesson = lessons.find((lesson) => lesson.id === courseProgress?.currentLessonId);
  const resumeLesson = currentLesson && getLessonStatus(course, courseProgress, currentLesson.id) === "available"
    ? currentLesson : availableLesson ?? currentLesson ?? lessons[0];

  return (
    <div className="learning-page">
      <Link className="back-link" href="/"><ArrowLeft size={16} aria-hidden="true" /> 내 학습으로</Link>
      <div className="page-heading">
        <div className="eyebrow">나의 학습 경로 <span aria-hidden="true">/</span> 커리큘럼</div>
        <div className="heading-badges"><Badge variant="secondary">{levelLabels[course.level]}</Badge><Badge variant="outline">{course.mode === "demo" ? "체험 코스" : "자료 기반 AI 코스"}</Badge></div>
        <h1>{course.title}</h1>
        <p className="page-intro">{course.description}</p>
      </div>

      <div className="course-layout">
        <div className="course-main">
          <section className="panel course-summary" aria-labelledby="course-progress-title">
            <div className="chapter-head">
              <div><span className="eyebrow">나의 발걸음</span><h2 id="course-progress-title">{completion === 100 ? "코스를 완주했어요!" : completedCount === 0 ? "첫 번째 레슨부터, 차근차근" : "조금씩, 이해가 쌓이고 있어요"}</h2></div>
              <span className="completion-number">{completion}<small>%</small></span>
            </div>
            <Progress value={completion} aria-label={`코스 진행률 ${completion}%`} />
            <div className="summary-footer">
              <span className="muted">{lessons.length}개 레슨 중 {completedCount}개 완료</span>
              {resumeLesson ? <Link className="button primary" href={`/course/${course.id}/lesson/${resumeLesson.id}`}>{completion === 100 ? "레슨 복습하기" : completedCount > 0 ? "이어서 학습하기" : "첫 레슨 시작하기"}<ArrowRight size={17} aria-hidden="true" /></Link> : null}
            </div>
          </section>

          {course.chapters.map((chapter) => (
            <section className="panel chapter" key={chapter.id} aria-labelledby={`heading-${chapter.id}`}>
              <div className="chapter-head">
                <div className="chapter-title"><span className="chapter-index">{String(chapter.order).padStart(2, "0")}</span><div><span className="eyebrow">챕터 {chapter.order}</span><h2 id={`heading-${chapter.id}`}>{chapter.title}</h2></div></div>
                <Badge variant="outline">{chapter.lessons.filter((lesson) => courseProgress?.completedLessonIds.includes(lesson.id)).length} / {chapter.lessons.length}</Badge>
              </div>
              <p className="muted chapter-description">{chapter.description}</p>
              <ul className="chapter-objectives">{chapter.objectives.map((objective, index) => <li key={`${chapter.id}-objective-${index}`}>{objective}</li>)}</ul>
              <ol className="lesson-list">
                {chapter.lessons.map((lesson) => {
                  const status = getLessonStatus(course, courseProgress, lesson.id);
                  const result = courseProgress?.quizResults[lesson.id];
                  const content = <><span className="lesson-number">{status === "completed" ? <Check size={18} aria-hidden="true" /> : status === "locked" ? <LockKeyhole size={17} aria-hidden="true" /> : <Play size={17} aria-hidden="true" />}</span><span className="lesson-row-content"><strong>{lesson.title}</strong><span className="lesson-meta"><Clock3 size={13} aria-hidden="true" /> {lesson.estimatedMinutes}분<span aria-hidden="true">·</span>{status === "completed" ? `완료 · 최고 점수 ${Math.round(result?.bestScore ?? 100)}점` : status === "locked" ? "이전 레슨을 통과하면 열려요" : "학습할 준비가 됐어요"}</span></span><span className="lesson-row-action">{status === "completed" ? "복습" : status === "locked" ? "잠김" : "학습하기"}{status !== "locked" ? <ArrowRight size={16} aria-hidden="true" /> : null}</span></>;
                  return <li key={lesson.id}>{status === "locked" ? <div className="lesson-row locked" aria-label={`${lesson.title}, 잠김`}>{content}</div> : <Link className={`lesson-row ${status === "completed" ? "complete" : "available"}`} href={`/course/${course.id}/lesson/${lesson.id}`}>{content}</Link>}</li>;
                })}
              </ol>
            </section>
          ))}
        </div>

        <aside className="course-aside">
          <section className="panel course-stats" aria-label="코스 정보">
            <div className="icon-box"><BookOpen size={22} aria-hidden="true" /></div>
            <h2>이 코스 한눈에 보기</h2>
            <dl className="stats-list"><div><dt>학습 구성</dt><dd>{course.chapters.length}개 챕터 · {lessons.length}개 레슨</dd></div><div><dt>예상 학습 시간</dt><dd>약 {lessons.reduce((sum, lesson) => sum + lesson.estimatedMinutes, 0)}분</dd></div><div><dt>쌓아온 경험치</dt><dd className="xp-stat"><Sparkles size={15} aria-hidden="true" /> {courseProgress?.totalXp ?? 0} XP</dd></div></dl>
            <p className="muted">퀴즈를 70% 이상 맞히면 다음 레슨이 열려요. 3문제 퀴즈에서는 3문제 모두 정답이어야 해요.</p>
          </section>
          <section className="panel source-panel" aria-labelledby="course-sources-title"><span className="eyebrow">참고 자료</span><h2 id="course-sources-title">함께 읽을 자료</h2><p className="muted">커리큘럼을 구성할 때 참고한 자료예요.</p><SourceList sources={course.sources} compact /></section>
          {course.mode === "demo" ? <p className="muted demo-notice">체험 코스는 학습 흐름을 살펴보기 위한 고정 예시예요. 웹 리서치와 AI 생성을 실행하지 않았어요.</p> : null}
        </aside>
      </div>
    </div>
  );
}

export function LearningLoading() {
  return <div className="screen-loading" aria-live="polite" aria-busy="true"><span className="eyebrow">내 학습 공간</span><div className="skeleton skeleton-heading" /><div className="skeleton skeleton-line" /><div className="skeleton skeleton-card" /><span className="sr-only">저장한 학습을 불러오고 있어요.</span></div>;
}

export function LearningEmpty({ courseId, locked = false, lessonMissing = false }: { courseId?: string; locked?: boolean; lessonMissing?: boolean }) {
  return <div className="panel empty-state"><div className="icon-box">{locked ? <LockKeyhole size={26} aria-hidden="true" /> : <BookOpen size={26} aria-hidden="true" />}</div><h1>{locked ? "앞 레슨을 먼저 마쳐볼까요?" : lessonMissing ? "이 레슨을 찾을 수 없어요" : "저장된 코스를 찾을 수 없어요"}</h1><p className="muted">{locked ? "이전 레슨의 퀴즈를 통과하면 이 레슨과 퀴즈가 함께 열려요." : lessonMissing ? "커리큘럼에서 학습할 수 있는 레슨을 선택해 주세요." : "학습은 이 브라우저에 저장돼요. 홈에서 새 코스를 만들거나 체험 코스를 시작해 주세요."}</p><Link className="button primary" href={courseId ? `/course/${courseId}` : "/"}>{courseId ? "커리큘럼으로" : "홈으로 가기"}<ArrowRight size={16} aria-hidden="true" /></Link></div>;
}
