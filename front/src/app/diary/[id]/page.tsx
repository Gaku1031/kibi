import { DiaryEditPage } from '../../../components/page/DiaryEditPage';

interface DiaryPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function DiaryPage({ params }: DiaryPageProps) {
  const { id } = await params;
  console.log('[DiaryPage] Rendering with ID:', id);
  return <DiaryEditPage id={id} />;
}