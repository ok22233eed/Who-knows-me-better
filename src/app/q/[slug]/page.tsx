import { QuizExperience } from "./quiz-experience";

export default async function QuizPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return <QuizExperience slug={slug} />;
}
