import { DiaryEditPage } from '../../../components/page/DiaryEditPage';

interface DiaryPageProps {
  params: {
    id: string;
  };
}

export default function DiaryPage({ params }: DiaryPageProps) {
  return <DiaryEditPage id={params.id} />;
}