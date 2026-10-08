import { CourseView } from "@/components/course-view";

export default async function CoursePage({ params }: { params: Promise<{ courseId: string }> }) {
  const { courseId } = await params;
  return <CourseView courseId={courseId} />;
}
