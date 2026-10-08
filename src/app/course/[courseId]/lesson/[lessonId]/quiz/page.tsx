import { QuizView } from "@/components/quiz-view";

export default async function QuizPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
  const { courseId, lessonId } = await params;
  return <QuizView courseId={courseId} lessonId={lessonId} />;
}
